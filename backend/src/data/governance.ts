/**
 * In-memory governance store — proposals, votes, transactions.
 * In production these would be Supabase tables:
 *   espacio_proposals, espacio_votes, espacio_transactions
 */

// ── Proposals (provider bids) ────────────────────────────────────────────────

export interface ProposalDoc {
  filename: string;
  type: string;
  storagePath: string;
}

export interface SimProposal {
  id: string;
  milestoneId: string;
  projectId: string;
  providerId: string;
  providerName: string;      // real legal name from RFC
  roleId?: string;           // the requiredRole slot id
  roleTitle?: string;        // e.g. "App Developer"
  roleDescription?: string;  // scope description from the slot
  quotedAmountMxn: number;
  timelineDays: number;
  scope: string;
  approach: string;
  experience: string;
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  documents: ProposalDoc[];
  status: 'DRAFT' | 'SUBMITTED' | 'WINNER' | 'REJECTED';
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const SIM_PROPOSALS: SimProposal[] = [];

export function getProposalsForMilestone(milestoneId: string): SimProposal[] {
  return SIM_PROPOSALS.filter(p => p.milestoneId === milestoneId && (p.status === 'SUBMITTED' || p.status === 'WINNER'));
}

export function addProposal(data: Omit<SimProposal, 'id' | 'createdAt' | 'updatedAt'>): SimProposal {
  const p: SimProposal = { ...data, id: `prop-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
  SIM_PROPOSALS.push(p);
  return p;
}

export function getProposal(id: string): SimProposal | undefined {
  return SIM_PROPOSALS.find(p => p.id === id);
}

export function updateProposal(id: string, updates: Partial<SimProposal>): SimProposal | null {
  const p = getProposal(id);
  if (!p) return null;
  Object.assign(p, updates, { updatedAt: new Date() });
  return p;
}

// ── Votes ────────────────────────────────────────────────────────────────────

export interface SimVote {
  id: string;
  milestoneId: string;
  projectId: string;
  investorId: string;   // one vote per investor per milestone
  proposalId: string;
  createdAt: Date;
}

export const SIM_VOTES: SimVote[] = [];

export function castVote(milestoneId: string, projectId: string, investorId: string, proposalId: string): { ok: boolean; error?: string; vote?: SimVote } {
  // Enforce one vote per investor per milestone
  const existing = SIM_VOTES.find(v => v.milestoneId === milestoneId && v.investorId === investorId);
  if (existing) return { ok: false, error: 'You have already voted on this milestone' };

  const vote: SimVote = { id: `vote-${Date.now()}`, milestoneId, projectId, investorId, proposalId, createdAt: new Date() };
  SIM_VOTES.push(vote);
  return { ok: true, vote };
}

export function getVoteResults(milestoneId: string): { proposalId: string; votes: number }[] {
  const counts: Record<string, number> = {};
  for (const v of SIM_VOTES.filter(v => v.milestoneId === milestoneId)) {
    counts[v.proposalId] = (counts[v.proposalId] || 0) + 1;
  }
  return Object.entries(counts).map(([proposalId, votes]) => ({ proposalId, votes })).sort((a, b) => b.votes - a.votes);
}

export function getInvestorVote(milestoneId: string, investorId: string): SimVote | undefined {
  return SIM_VOTES.find(v => v.milestoneId === milestoneId && v.investorId === investorId);
}

// ── Transactions (disbursement ledger) ───────────────────────────────────────

export interface SimTransaction {
  id: string;
  projectId: string;
  milestoneId: string;
  milestoneTitle: string;
  providerId: string;
  providerName: string;      // real legal name — no aliases
  bankMasked: string;        // e.g. "BBVA ****4614"
  cfdiUuid: string;
  amountMxn: number;
  date: Date;
  status: 'PENDING' | 'COMPLETED';
}

export const SIM_TRANSACTIONS: SimTransaction[] = [];

export function addTransaction(data: Omit<SimTransaction, 'id'>): SimTransaction {
  const tx: SimTransaction = { ...data, id: `tx-${Date.now()}` };
  SIM_TRANSACTIONS.push(tx);
  return tx;
}

export function getTransactionsForProject(projectId: string): SimTransaction[] {
  return SIM_TRANSACTIONS.filter(t => t.projectId === projectId).sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ── Voting windows (per milestone) ───────────────────────────────────────────
// In production, votingOpenUntil lives on the Milestone DB record.

export const MILESTONE_VOTING_WINDOWS: Record<string, Date> = {
  'm2': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // m2 voting open for 7 days
};

export function isVotingOpen(milestoneId: string): boolean {
  const deadline = MILESTONE_VOTING_WINDOWS[milestoneId];
  if (!deadline) return false;
  return new Date() < deadline;
}

export function setVotingWindow(milestoneId: string, days: number): Date {
  const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  MILESTONE_VOTING_WINDOWS[milestoneId] = deadline;
  return deadline;
}

// ── Milestone cost items (provider expense logging) ──────────────────────────

export interface CostItem {
  id: string;
  milestoneId: string;
  projectId: string;
  providerId: string;
  providerName: string;
  description: string;
  amountMxn: number;
  category: 'labor' | 'materials' | 'equipment' | 'services' | 'other';
  date: Date;
}

export const SIM_COST_ITEMS: CostItem[] = [];

export function addCostItem(data: Omit<CostItem, 'id'>): CostItem {
  const item: CostItem = { ...data, id: `cost-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
  SIM_COST_ITEMS.push(item);
  return item;
}

export function getCostItemsForMilestone(milestoneId: string): CostItem[] {
  return SIM_COST_ITEMS.filter(c => c.milestoneId === milestoneId);
}

// ── Milestone evidence documents ──────────────────────────────────────────────

export interface EvidenceDoc {
  id: string;
  milestoneId: string;
  projectId: string;
  uploadedBy: string;        // userId
  filename: string;
  mimeType: string;          // application/pdf | text/xml
  sizeBytes: number;
  // In sim: store small base64 or just metadata
  dataBase64?: string;
  uploadedAt: Date;
  validated: boolean;        // planner/admin marked as valid
}

export const SIM_EVIDENCE_DOCS: EvidenceDoc[] = [];

export function addEvidenceDoc(data: Omit<EvidenceDoc, 'id'>): EvidenceDoc {
  const doc: EvidenceDoc = { ...data, id: `doc-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
  SIM_EVIDENCE_DOCS.push(doc);
  return doc;
}

export function getEvidenceForMilestone(milestoneId: string): EvidenceDoc[] {
  return SIM_EVIDENCE_DOCS.filter(d => d.milestoneId === milestoneId);
}

// ── Investment event log (full audit trail) ───────────────────────────────────

export interface InvestmentEvent {
  id: string;
  type: 'INVEST' | 'DISBURSE' | 'REFUND';
  projectId: string;
  milestoneId?: string;
  milestoneTitle?: string;
  actorId: string;           // userId (investor or planner)
  actorName?: string;
  mxnAmount: number;
  ethAmount: number;
  weiAmount: string;
  bitsoOrderId?: string;
  note?: string;
  createdAt: Date;
}

export const INVESTMENT_EVENTS: InvestmentEvent[] = [];

export function addInvestmentEvent(data: Omit<InvestmentEvent, 'id'>): InvestmentEvent {
  const ev: InvestmentEvent = { ...data, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
  INVESTMENT_EVENTS.push(ev);
  return ev;
}

export function getEventsForProject(projectId: string): InvestmentEvent[] {
  return INVESTMENT_EVENTS.filter(e => e.projectId === projectId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Full governance reset — clears all proposals, votes, transactions, and voting windows. */
export function resetGovernance(): void {
  SIM_PROPOSALS.splice(0);
  SIM_VOTES.splice(0);
  SIM_TRANSACTIONS.splice(0);
  SIM_COST_ITEMS.splice(0);
  SIM_EVIDENCE_DOCS.splice(0);
  INVESTMENT_EVENTS.splice(0);
  for (const key of Object.keys(MILESTONE_VOTING_WINDOWS)) {
    delete MILESTONE_VOTING_WINDOWS[key];
  }
}
