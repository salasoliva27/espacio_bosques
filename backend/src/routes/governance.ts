/**
 * /api/governance — Proposals, voting, and transaction ledger.
 *
 * POST /api/governance/proposals                    — start a proposal (DRAFT)
 * POST /api/governance/proposals/:id/chat           — AI chat turn for proposal intake
 * POST /api/governance/proposals/:id/submit         — finalize and submit proposal
 * GET  /api/governance/milestones/:milestoneId/proposals — list submitted proposals
 * GET  /api/governance/milestones/:milestoneId/votes     — get live vote results + own vote
 * POST /api/governance/milestones/:milestoneId/vote      — cast a vote (auth required)
 * POST /api/governance/milestones/:milestoneId/voting-window — set voting window (admin)
 * GET  /api/governance/projects/:projectId/transactions — public ledger
 * POST /api/governance/projects/:projectId/transactions — record disbursement (admin)
 */
import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { SIMULATION_MODE } from '../config/mode';
import { getProvider, SIM_PROVIDERS } from '../data/providers';
import {
  SIM_PROPOSALS, SIM_VOTES, SIM_TRANSACTIONS,
  getProposalsForMilestone, addProposal, getProposal, updateProposal,
  castVote, getVoteResults, getInvestorVote,
  getTransactionsForProject, addTransaction,
  isVotingOpen, setVotingWindow, MILESTONE_VOTING_WINDOWS,
} from '../data/governance';
import { DEMO_PROJECTS, getProviderUserProfile } from '../data/simStore';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

/** Extract the first balanced JSON object from a string (handles nested braces). */
function extractJsonObject(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

const PROPOSAL_SYSTEM = `You are a project intake assistant for Espacio Bosques — a community funding platform for Bosques de las Lomas, CDMX.

A provider (contractor/vendor) is submitting a bid proposal for a specific community project milestone. Your job is to help them build a complete, structured proposal through conversation — and to actively help them price it well using their own registered services.

Collect in order (ask one topic at a time, conversationally):
1. Their proposed approach and scope of work for the milestone
2. Their quoted amount in MXN — if provider services are listed below, reference their typical price range to anchor the conversation (e.g. "Based on your [service name], your typical range is X–Y MXN. Does that apply here, or does this scope differ?"). Ask them to confirm or adjust and briefly break down: labor, materials, equipment.
3. Their estimated timeline in calendar days
4. Relevant experience — similar projects completed, certifications, references if any
5. Confirm: any questions or clarifications needed about the milestone?

Rules:
- Be concise. Ask one clear question at a time.
- Use the provider's registered services as context — if a service matches the milestone, surface the typical price. Do not invent numbers.
- When you have complete answers for all 5 points, say: "I have everything I need. Ready to submit your proposal?"
- Never fabricate information. If they haven't answered something, ask again.
- When all fields are collected, respond ONLY with valid JSON on its own line: {"ready": true, "summary": {"scope": "...", "quotedAmountMxn": 0, "timelineDays": 0, "approach": "...", "experience": "..."}}

IMPORTANT: quotedAmountMxn must be a plain number (no commas, no currency symbol). timelineDays must be a plain number.`

// ── POST /api/governance/proposals ──────────────────────────────────────────

router.post('/proposals', requireAuth, (req: AuthRequest, res: Response) => {
  const { milestoneId, projectId, providerId } = req.body;
  if (!milestoneId || !projectId || !providerId) {
    return res.status(400).json({ error: 'Missing: milestoneId, projectId, providerId' });
  }

  let resolvedProviderId: string;
  let resolvedProviderName: string;

  if (providerId === 'self') {
    // Self-provider: use the user's own provider profile
    const selfProfile = getProviderUserProfile(req.user!.id);
    if (!selfProfile || !selfProfile.enabled) {
      return res.status(403).json({ error: 'Enable your provider profile first' });
    }
    resolvedProviderId = req.user!.id;
    resolvedProviderName = selfProfile.companyName || req.user!.email || 'Provider';
  } else {
    const provider = getProvider(providerId) || SIM_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    if (provider.status !== 'VERIFIED') return res.status(403).json({ error: 'Provider must be VERIFIED to submit proposals' });
    resolvedProviderId = providerId;
    resolvedProviderName = provider.name;
  }

  // Check for existing draft
  const existing = SIM_PROPOSALS.find(p => p.milestoneId === milestoneId && p.providerId === resolvedProviderId && p.status === 'DRAFT');
  if (existing) return res.json({ proposal: existing });

  const proposal = addProposal({
    milestoneId, projectId, providerId: resolvedProviderId,
    providerName: resolvedProviderName,
    quotedAmountMxn: 0, timelineDays: 0,
    scope: '', approach: '', experience: '',
    chatMessages: [], documents: [], status: 'DRAFT',
  });

  res.status(201).json({ proposal });
});

// ── POST /api/governance/proposals/:id/chat ──────────────────────────────────

router.post('/proposals/:id/chat', requireAuth, async (req: AuthRequest, res: Response) => {
  const proposal = getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  if (proposal.status !== 'DRAFT') return res.status(400).json({ error: 'Proposal already submitted' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  // Find milestone info for context
  const project = DEMO_PROJECTS.find(p => p.id === proposal.projectId);
  const milestone = project?.milestones.find(m => m.id === proposal.milestoneId);
  const milestoneContext = milestone
    ? `\nMilestone: "${milestone.title}" — ${milestone.description} (${milestone.fundingPercentage}% of project budget, ${milestone.durationDays} days planned)`
    : '';

  // Inject provider's registered services so AI can reference typical prices
  const providerProfile = getProviderUserProfile(req.user!.id);
  let serviceContext = '';
  if (providerProfile?.services && providerProfile.services.length > 0) {
    const finalizedServices = providerProfile.services.filter(s => s.finalized);
    if (finalizedServices.length > 0) {
      serviceContext = '\n\nProvider\'s registered services:\n' + finalizedServices.map(s =>
        `- ${s.name}: ${s.description || '(no description)'} | Typical price: ${s.typicalPriceMxn || 'not specified'} | Deliverables: ${s.deliverables?.join(', ') || 'not listed'}`
      ).join('\n');
    }
  }

  const newUserMsg = { role: 'user' as const, content: message };
  const history = [...proposal.chatMessages, newUserMsg];

  try {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: PROPOSAL_SYSTEM + milestoneContext + serviceContext,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    });

    const text = (response.content.find(b => b.type === 'text') as any)?.text ?? '';
    const assistantMsg = { role: 'assistant' as const, content: text };
    const updatedMessages = [...history, assistantMsg];

    // Check if AI signals readiness — use brace-balanced extractor (regex fails on nested JSON)
    let ready = false;
    let summary: any = null;
    if (text.includes('"ready"') && text.includes('true')) {
      const parsed = extractJsonObject(text);
      if (parsed?.ready && parsed?.summary) { ready = true; summary = parsed.summary; }
    }

    updateProposal(proposal.id, { chatMessages: updatedMessages });
    logger.info('[governance] proposal chat turn', { proposalId: proposal.id, ready });

    res.json({ message: text, ready, summary });
  } catch (err: any) {
    logger.error('[governance] proposal chat failed', { error: err.message });
    res.status(500).json({ error: 'AI error', details: err.message });
  }
});

// ── POST /api/governance/proposals/:id/submit ────────────────────────────────

router.post('/proposals/:id/submit', requireAuth, (req: AuthRequest, res: Response) => {
  const proposal = getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

  const { scope, approach, experience, quotedAmountMxn, timelineDays } = req.body;
  if (!scope || !quotedAmountMxn || !timelineDays) {
    return res.status(400).json({ error: 'Missing: scope, quotedAmountMxn, timelineDays' });
  }

  updateProposal(proposal.id, {
    scope, approach: approach || '', experience: experience || '',
    quotedAmountMxn: Number(quotedAmountMxn), timelineDays: Number(timelineDays),
    status: 'SUBMITTED', submittedAt: new Date(),
  });

  logger.info('[governance] proposal submitted', { proposalId: proposal.id, providerId: proposal.providerId });
  res.json({ proposal: getProposal(proposal.id) });
});

// ── GET /api/governance/milestones/:milestoneId/proposals ────────────────────

router.get('/milestones/:milestoneId/proposals', requireAuth, (req: AuthRequest, res: Response) => {
  const proposals = getProposalsForMilestone(req.params.milestoneId);
  res.json({ proposals, total: proposals.length });
});

// ── GET /api/governance/milestones/:milestoneId/votes ────────────────────────

router.get('/milestones/:milestoneId/votes', requireAuth, (req: AuthRequest, res: Response) => {
  const { milestoneId } = req.params;
  const results = getVoteResults(milestoneId);
  const total = SIM_VOTES.filter(v => v.milestoneId === milestoneId).length;
  const myVote = req.user?.id ? getInvestorVote(milestoneId, req.user.id) : undefined;
  const open = isVotingOpen(milestoneId);
  const deadline = MILESTONE_VOTING_WINDOWS[milestoneId] ?? null;

  res.json({ results, totalVotes: total, myVote: myVote?.proposalId ?? null, votingOpen: open, votingDeadline: deadline });
});

// ── POST /api/governance/milestones/:milestoneId/vote ────────────────────────

router.post('/milestones/:milestoneId/vote', requireAuth, (req: AuthRequest, res: Response) => {
  const { milestoneId } = req.params;
  const { proposalId } = req.body;
  const investorId = req.user!.id;

  if (!proposalId) return res.status(400).json({ error: 'Missing proposalId' });
  if (!isVotingOpen(milestoneId)) return res.status(403).json({ error: 'Voting is not open for this milestone' });

  const proposal = getProposal(proposalId);
  if (!proposal || proposal.milestoneId !== milestoneId) {
    return res.status(400).json({ error: 'Invalid proposalId for this milestone' });
  }

  const result = castVote(milestoneId, proposal.projectId, investorId, proposalId);
  if (!result.ok) return res.status(409).json({ error: result.error });

  logger.info('[governance] vote cast', { milestoneId, investorId, proposalId });
  const results = getVoteResults(milestoneId);
  res.json({ ok: true, results, totalVotes: SIM_VOTES.filter(v => v.milestoneId === milestoneId).length });
});

// ── POST /api/governance/milestones/:milestoneId/voting-window ───────────────

router.post('/milestones/:milestoneId/voting-window', requireAuth, (req: AuthRequest, res: Response) => {
  const { days } = req.body;
  if (!days || isNaN(Number(days))) return res.status(400).json({ error: 'Missing days (number)' });
  const deadline = setVotingWindow(req.params.milestoneId, Number(days));
  res.json({ ok: true, milestoneId: req.params.milestoneId, votingOpenUntil: deadline });
});

// ── GET /api/governance/projects/:projectId/transactions ─────────────────────

router.get('/projects/:projectId/transactions', (req: AuthRequest, res: Response) => {
  const txs = getTransactionsForProject(req.params.projectId);
  res.json({ transactions: txs, total: txs.length });
});

// ── POST /api/governance/projects/:projectId/transactions ────────────────────

router.post('/projects/:projectId/transactions', requireAuth, (req: AuthRequest, res: Response) => {
  const { milestoneId, milestoneTitle, providerId, cfdiUuid, amountMxn } = req.body;
  if (!milestoneId || !milestoneTitle || !providerId || !cfdiUuid || !amountMxn) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const provider = getProvider(providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  // Mask CLABE: bank code (first 3 digits → bank name lookup) + last 4
  const clabe = provider.clabe;
  const bankCode = clabe.slice(0, 3);
  const BANK_CODES: Record<string, string> = {
    '014': 'BBVA', '002': 'BANAMEX', '006': 'BANCOMEXT', '021': 'HSBC',
    '012': 'BBVA', '044': 'SCOTIABANK', '058': 'BANREGIO', '846': 'STP',
  };
  const bankName = BANK_CODES[bankCode] ?? `Banco ${bankCode}`;
  const bankMasked = `${bankName} ****${clabe.slice(-4)}`;

  const tx = addTransaction({
    projectId: req.params.projectId,
    milestoneId, milestoneTitle,
    providerId, providerName: provider.name,
    bankMasked, cfdiUuid,
    amountMxn: Number(amountMxn),
    date: new Date(),
    status: 'COMPLETED',
  });

  logger.info('[governance] transaction recorded', { txId: tx.id, amountMxn: tx.amountMxn });
  res.status(201).json({ transaction: tx });
});

export default router;
