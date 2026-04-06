/**
 * Espacio Bosques — shared knowledge base.
 * Persists lessons, benchmarks, regulations, and provider notes across all projects.
 * In simulation mode this is in-memory. In production it mirrors to Supabase (bosques_knowledge table).
 *
 * IMPORTANT: This is NOT a vendor directory. It captures what was learned so future
 * projects can compete with better-informed proposals — not so the same provider wins again.
 */

export interface KnowledgeEntry {
  id: string;
  type: 'lesson' | 'benchmark' | 'regulation' | 'provider_note';
  category: string;
  title: string;
  content: string;
  tags: string[];
  projectId: string | null;
  learnedAt: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'k001',
    type: 'regulation',
    category: 'drones',
    title: 'Drone operation in CDMX residential areas (AFAC)',
    content: `AFAC (Agencia Federal de Aviación Civil) requires registration for drones over 250g. In Bosques de las Lomas, flights must stay below 120m AGL and avoid restricted airspace near Los Pinos and Chapultepec. Night flights require a separate AFAC permit. Previous estimate: 6–8 weeks for standard permit approval. Pilot must hold AFAC RPAS operator certificate. Liability insurance minimum $500,000 MXN required for operations over residential streets.`,
    tags: ['drones', 'AFAC', 'regulation', 'airspace', 'RPAS'],
    projectId: null,
    learnedAt: '2026-01-15',
  },
  {
    id: 'k002',
    type: 'lesson',
    category: 'security',
    title: 'Street-facing cameras: SEDUVI + junta de vecinos approvals',
    content: `Street-facing cameras in Bosques require both SEDUVI (Secretaría de Desarrollo Urbano y Vivienda) permit AND written approval from the junta de vecinos. The junta step typically adds 3–4 weeks. INAI rules require visible signage at each camera location informing residents of recording zones. Budget ~$8,000 MXN per camera for permitting, signage, and INAI-compliant privacy notices — on top of hardware. Data must be stored locally or in a Mexican data center (no US-only cloud).`,
    tags: ['cameras', 'security', 'SEDUVI', 'INAI', 'privacy', 'permits'],
    projectId: null,
    learnedAt: '2026-02-01',
  },
  {
    id: 'k003',
    type: 'benchmark',
    category: 'infrastructure',
    title: 'Street lighting upgrades: cost and timeline benchmarks (Miguel Hidalgo)',
    content: `LED retrofit of a standard lamp post in CDMX: $12,000–18,000 MXN installed (fixture + labor + SACMEX coordination permit). Solar posts cost 40–60% more but avoid SACMEX permitting entirely. Timeline: 8–12 weeks permit-to-inspection. Alcaldía Miguel Hidalgo (covers Bosques de las Lomas) has an expedited track for colonia-funded projects — reduces permitting by ~3 weeks if the colonia submits a resolution letter from the junta de vecinos.`,
    tags: ['lighting', 'LED', 'solar', 'SACMEX', 'Miguel Hidalgo', 'benchmarks'],
    projectId: null,
    learnedAt: '2026-01-20',
  },
  {
    id: 'k004',
    type: 'lesson',
    category: 'parks',
    title: 'Green space: soil, frost risk, and native species for Bosques de las Lomas',
    content: `Bosques de las Lomas sits at ~2,350m with clay-heavy soil and frost risk in Dec–Feb. Native species that thrive: tepozán (Buddleja cordata), colorín (Erythrina americana), salvia mexicana, agave victoriae-reginae, palo dulce (Eysenhardtia polystachya). Avoid tropical species — bougainvillea and heliconia at ground level are killed by frost. Drip irrigation using rainwater collection reduces SACMEX dependency ~60%. Amend soil with milpa alta compost before planting. Allow 2 full growing seasons before judging survival rates.`,
    tags: ['parks', 'plants', 'native species', 'frost', 'soil', 'irrigation'],
    projectId: null,
    learnedAt: '2026-03-10',
  },
  {
    id: 'k005',
    type: 'benchmark',
    category: 'procurement',
    title: 'CDMX vendor procurement: 3-quote rule and SAT validation',
    content: `For disbursements over $50,000 MXN from community funds, require 3 competing quotes minimum. Vendor checklist: RFC, Constancia de Situación Fiscal (current quarter), 2 CDMX references with contact info, bank account under same RFC. Payment terms standard in CDMX construction: 30% upfront, 40% at defined milestone, 30% on signed acceptance. Vendors requesting >50% upfront are a red flag. Always verify SAT status at sat.gob.mx before signing. All invoices must be CFDI 4.0.`,
    tags: ['procurement', 'vendors', 'RFC', 'SAT', 'CFDI', 'contracts'],
    projectId: null,
    learnedAt: '2026-01-10',
  },
  {
    id: 'k006',
    type: 'lesson',
    category: 'technology',
    title: 'IoT/sensor connectivity in Bosques de las Lomas',
    content: `LTE (AT&T and Telcel) is reliable throughout the colonia. For mesh sensor networks, LoRaWAN achieves ~1.5km range at street level in this zone. Fiber conduit exists on Paseo de las Palmas and Explanada; lateral streets are DSL only. Power outages average 2–3 per year — outdoor electronics need UPS or solar+battery. For any device that stores personal data (faces, license plates), encryption at rest is required under LFPDPPP.`,
    tags: ['IoT', 'LoRaWAN', 'LTE', 'fiber', 'connectivity', 'LFPDPPP'],
    projectId: null,
    learnedAt: '2026-02-15',
  },
  {
    id: 'k007',
    type: 'regulation',
    category: 'finance',
    title: 'Community fund accountability: Ley Fintech, SAT, CFDI requirements',
    content: `Collecting MXN from residents without a licensed IFPE violates Ley Fintech. Espacio Bosques uses Bitso as the licensed intermediary. All disbursements over $2,000 MXN must be backed by a CFDI 4.0 (factura electrónica) from the vendor — cash payments are not auditable and must be capped at $500 MXN. Retain all CFDIs for 5 years (SAT requirement). Milestone-based fund release: escrow holds until milestone evidence is submitted and approved by the community quorum.`,
    tags: ['Ley Fintech', 'SAT', 'CFDI', 'escrow', 'accountability', 'CNBV'],
    projectId: null,
    learnedAt: '2026-01-05',
  },
  {
    id: 'k008',
    type: 'lesson',
    category: 'community',
    title: 'Resident engagement: quorum and approval thresholds in Bosques',
    content: `Based on early conversations with colonia residents: WhatsApp broadcast groups reach ~70% of households fastest. For project approval, a quorum of 30% of registered households responding is considered valid for non-structural changes; 50%+ for changes to public infrastructure. Evening meetings (7–9pm) on Tuesdays/Thursdays get the best attendance. Physical signage at Explanada de las Palmas and the main entrances is essential alongside digital — not all residents are on the same groups.`,
    tags: ['community', 'engagement', 'quorum', 'governance', 'residents'],
    projectId: null,
    learnedAt: '2026-03-01',
  },
];

/**
 * Retrieve knowledge entries relevant to a given query.
 * Simple tag + category matching — replace with vector search when Supabase pgvector is enabled.
 */
export function queryKnowledge(query: string, limit = 4): KnowledgeEntry[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;
    if (entry.title.toLowerCase().includes(q)) score += 3;
    if (entry.content.toLowerCase().includes(q)) score += 2;
    if (entry.tags.some((tag) => q.includes(tag) || tag.includes(q))) score += 2;
    if (entry.category.toLowerCase().includes(q)) score += 1;
    // Always include finance/regulation entries for any project
    if (entry.type === 'regulation' || entry.id === 'k005' || entry.id === 'k007') score += 0.5;
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

/**
 * Format knowledge entries into a concise context block for AI prompts.
 */
export function formatKnowledgeContext(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '';
  const lines = entries.map(
    (e) => `[${e.type.toUpperCase()} — ${e.category}] ${e.title}:\n${e.content}`
  );
  return `\n\n--- SHARED KNOWLEDGE BASE (from previous Espacio Bosques projects) ---\n${lines.join('\n\n')}\n--- END KNOWLEDGE BASE ---\n\nUse this knowledge to inform your proposal. Do NOT copy provider names as recommendations — use them only to understand what types of vendors exist and what questions to ask. Competition between providers is a core value of Espacio Bosques.`;
}
