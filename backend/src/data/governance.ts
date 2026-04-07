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
  return SIM_PROPOSALS.filter(p => p.milestoneId === milestoneId && p.status === 'SUBMITTED');
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

export const SIM_TRANSACTIONS: SimTransaction[] = [
  {
    id: 'tx-001',
    projectId: 'demo-project-001',
    milestoneId: 'm1',
    milestoneTitle: 'Hardware procurement & site survey',
    providerId: 'prov-001',
    providerName: 'Constructora Bosques S.A. de C.V.',
    bankMasked: 'BBVA ****4614',
    cfdiUuid: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
    amountMxn: 45000,
    date: new Date('2026-02-15'),
    status: 'COMPLETED',
  },
];

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
