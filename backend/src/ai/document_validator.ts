/**
 * AI document validator — uses Claude to verify uploaded evidence docs
 * match the logged cost items for a milestone.
 *
 * Strategies:
 *   1. CFDI XML  → parse SAT attributes, extract Total + Concepto descriptions
 *   2. PDF/image with base64 → Claude vision analysis
 *   3. No base64 / large file → heuristic validation based on filename + costs
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AiDocAnalysis, CostItem } from '../data/governance';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

// ── XML CFDI parser ─────────────────────────────────────────────────────────

function parseCfdiXml(xmlText: string): { total?: number; descriptions: string[]; rfc?: string; date?: string } {
  const totalMatch = xmlText.match(/Total="([0-9.]+)"/);
  const rfcMatch = xmlText.match(/Emisor[^>]*Rfc="([^"]+)"/);
  const dateMatch = xmlText.match(/Fecha="([^"]+)"/);
  const descriptions: string[] = [];
  const descRegex = /Descripcion="([^"]+)"/g;
  let m;
  while ((m = descRegex.exec(xmlText)) !== null) descriptions.push(m[1]);
  return {
    total: totalMatch ? parseFloat(totalMatch[1]) : undefined,
    descriptions,
    rfc: rfcMatch?.[1],
    date: dateMatch?.[1],
  };
}

// ── Claude vision / document analysis ────────────────────────────────────────

async function analyzeWithClaude(
  base64: string,
  mimeType: string,
  costItems: CostItem[]
): Promise<{ valid: boolean; extractedAmount?: number; description?: string; notes: string }> {
  const costSummary = costItems.map(c => `• ${c.description}: $${c.amountMxn.toLocaleString()} MXN (${c.category})`).join('\n');
  const totalLogged = costItems.reduce((s, c) => s + c.amountMxn, 0);

  try {
    const content: Anthropic.MessageParam['content'] = [];

    if (mimeType === 'application/pdf') {
      content.push({
        type: 'document' as any,
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      });
    } else if (mimeType.startsWith('image/')) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType as any, data: base64 },
      });
    }

    content.push({
      type: 'text',
      text: `You are an expense auditor for a community real-estate project in Mexico City.

The provider logged these expenses for a milestone:
${costSummary}
Total logged: $${totalLogged.toLocaleString()} MXN

Analyze this document and answer:
1. Is this a legitimate invoice, receipt, or CFDI?
2. What is the total amount on the document? (extract it exactly)
3. Does the amount match or reasonably justify the logged expenses?
4. Does the description match the type of work logged?

Respond as JSON only:
{
  "valid": true/false,
  "extractedAmount": <number or null>,
  "description": "<one sentence about what the doc shows>",
  "matchesExpenses": true/false,
  "notes": "<2-3 sentence audit summary>"
}`,
    });

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content }],
    });

    const text = (resp.content[0] as any).text as string;
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      valid: !!parsed.valid,
      extractedAmount: parsed.extractedAmount ?? undefined,
      description: parsed.description ?? '',
      notes: parsed.notes ?? '',
    };
  } catch (err: any) {
    return { valid: false, notes: `AI analysis failed: ${err.message}` };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function validateDocument(
  filename: string,
  mimeType: string,
  dataBase64: string | undefined,
  costItems: CostItem[]
): Promise<AiDocAnalysis> {
  const totalLogged = costItems.reduce((s, c) => s + c.amountMxn, 0);

  // ── Strategy 1: XML CFDI ──────────────────────────────────────────────────
  if (mimeType === 'text/xml' || mimeType === 'application/xml' || filename.toLowerCase().endsWith('.xml')) {
    if (dataBase64) {
      const xmlText = Buffer.from(dataBase64, 'base64').toString('utf-8');
      const cfdi = parseCfdiXml(xmlText);
      const extractedAmount = cfdi.total;
      const descMatch = cfdi.descriptions.some(d =>
        costItems.some(c => d.toLowerCase().includes(c.category.toLowerCase()) || c.description.toLowerCase().split(' ').some(w => w.length > 4 && d.toLowerCase().includes(w)))
      );
      const amountMatch = extractedAmount ? Math.abs(extractedAmount - totalLogged) / Math.max(totalLogged, 1) < 0.20 : false;
      const matchScore = (amountMatch ? 50 : 10) + (descMatch ? 30 : 0) + (cfdi.rfc ? 20 : 0);
      return {
        valid: matchScore >= 60,
        docType: 'CFDI_XML',
        extractedAmountMxn: extractedAmount,
        extractedDescription: cfdi.descriptions[0],
        matchesCostItems: amountMatch && descMatch,
        matchScore: Math.min(matchScore, 100),
        notes: cfdi.rfc
          ? `CFDI from RFC ${cfdi.rfc}. Total: $${extractedAmount?.toLocaleString() ?? '?'} MXN. ${amountMatch ? 'Amount matches logged costs.' : 'Amount differs from logged costs — review required.'}`
          : 'XML does not appear to be a valid SAT CFDI. Missing RFC emisor.',
        analyzedAt: new Date(),
      };
    }
    // XML filename but no content
    return {
      valid: true, docType: 'CFDI_XML', matchesCostItems: false, matchScore: 40,
      notes: 'CFDI XML file received but content not provided (file too large for sim). Manual review required.',
      analyzedAt: new Date(),
    };
  }

  // ── Strategy 2: PDF or image with base64 → Claude vision ─────────────────
  if (dataBase64 && (mimeType === 'application/pdf' || mimeType.startsWith('image/'))) {
    const result = await analyzeWithClaude(dataBase64, mimeType, costItems);
    const amountMatch = result.extractedAmount ? Math.abs(result.extractedAmount - totalLogged) / Math.max(totalLogged, 1) < 0.20 : false;
    const matchScore = (result.valid ? 40 : 0) + (amountMatch ? 40 : 0) + (result.extractedAmount ? 20 : 0);
    return {
      valid: result.valid,
      docType: mimeType === 'application/pdf' ? 'PDF_INVOICE' : 'IMAGE',
      extractedAmountMxn: result.extractedAmount,
      extractedDescription: result.description,
      matchesCostItems: amountMatch,
      matchScore: Math.min(matchScore, 100),
      notes: result.notes,
      analyzedAt: new Date(),
    };
  }

  // ── Strategy 3: Heuristic (no base64) ────────────────────────────────────
  const lname = filename.toLowerCase();
  const isInvoiceName = ['factura', 'invoice', 'receipt', 'cfdi', 'recibo', 'comprobante'].some(k => lname.includes(k));
  const matchScore = isInvoiceName ? 55 : 30;
  return {
    valid: isInvoiceName,
    docType: mimeType === 'application/pdf' ? 'PDF_INVOICE' : 'UNKNOWN',
    matchesCostItems: false,
    matchScore,
    notes: isInvoiceName
      ? `Document filename suggests a valid invoice/receipt. Full content analysis requires file upload under 500KB.`
      : `Could not determine document type from filename "${filename}". Manual review required.`,
    analyzedAt: new Date(),
  };
}
