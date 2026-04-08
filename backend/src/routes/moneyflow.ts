/**
 * Money flow + milestone completion with community evidence review
 *
 * GET  /api/moneyflow/:projectId/events
 * GET  /api/moneyflow/:projectId/diagram
 * GET  /api/moneyflow/:projectId/contributor/:uid
 *
 * POST /api/moneyflow/:projectId/milestones/:mid/costs
 * GET  /api/moneyflow/:projectId/milestones/:mid/costs
 * POST /api/moneyflow/:projectId/milestones/:mid/documents    ← AI validates doc on upload
 * GET  /api/moneyflow/:projectId/milestones/:mid/documents
 * POST /api/moneyflow/:projectId/milestones/:mid/complete     ← creates CompletionRequest
 *
 * GET  /api/moneyflow/:projectId/completion-requests          ← all requests for project
 * GET  /api/moneyflow/:projectId/completion-requests/:reqId
 * POST /api/moneyflow/:projectId/completion-requests/:reqId/vote          ← APPROVE|REJECT
 * POST /api/moneyflow/:projectId/completion-requests/:reqId/owner-decide  ← owner override
 */
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  addCostItem, getCostItemsForMilestone,
  addEvidenceDoc, getEvidenceForMilestone,
  addInvestmentEvent, getEventsForProject,
  addCompletionRequest, getCompletionRequestsForProject, getCompletionRequest, SIM_COMPLETION_REQUESTS,
  castEvidenceVote, getEvidenceVotesForRequest, resolveCompletionVoting,
  createNotification,
  SIM_EVIDENCE_DOCS,
} from '../data/governance';
import { DEMO_PROJECTS } from '../data/simStore';
import { validateDocument } from '../ai/document_validator';
import { logger } from '../utils/logger';

const router = Router();
const ETH_MXN = 65000;

// ── helpers ──────────────────────────────────────────────────────────────────

/** Count unique eligible voters for a project (investors). */
function countEligibleVoters(project: any): number {
  const ids = new Set<string>();
  for (const inv of (project.investments ?? []) as any[]) {
    if (inv.investor?.id) ids.add(inv.investor.id);
  }
  return ids.size;
}

/** Notify all investors of a project. */
function notifyInvestors(project: any, notification: Omit<Parameters<typeof createNotification>[0], 'userId'>) {
  const ids = new Set<string>();
  for (const inv of (project.investments ?? []) as any[]) {
    if (inv.investor?.id) ids.add(inv.investor.id);
  }
  for (const id of ids) createNotification({ ...notification, userId: id });
}

/** Apply vote resolution: update milestone status and emit DISBURSE event if approved. */
function applyResolution(
  project: any,
  milestone: any,
  request: ReturnType<typeof getCompletionRequest>,
  status: 'APPROVED' | 'REJECTED',
  note: string
) {
  if (!request) return;
  request.status = status;
  request.resolvedAt = new Date();
  request.resolutionNote = note;

  if (status === 'APPROVED') {
    milestone.status = 'COMPLETED';
    project.updatedAt = new Date();
    const mxn = request.totalCostMxn;
    const ethAmt = mxn / ETH_MXN;
    addInvestmentEvent({
      type: 'DISBURSE',
      projectId: project.id,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      actorId: request.submittedBy,
      actorName: request.submitterName,
      mxnAmount: mxn,
      ethAmount: ethAmt,
      weiAmount: (BigInt(Math.round(ethAmt * 1e12)) * BigInt(1e6)).toString(),
      bitsoOrderId: `DISBURSE-${Date.now()}`,
      note: `Milestone "${milestone.title}" approved by community`,
      createdAt: new Date(),
    });
    // Notify provider
    createNotification({
      userId: request.submittedBy,
      type: 'MILESTONE_APPROVED',
      title: 'Milestone approved — payment released',
      body: `"${milestone.title}" was approved by the community. $${mxn.toLocaleString()} MXN will be disbursed.`,
      projectId: project.id,
      milestoneId: milestone.id,
      requestId: request.id,
    });
    // Notify all investors
    notifyInvestors(project, {
      type: 'PROJECT_UPDATE',
      title: `Milestone completed: ${milestone.title}`,
      body: `The community approved completion of "${milestone.title}" in ${project.title}. Funds disbursed.`,
      projectId: project.id,
      milestoneId: milestone.id,
    });
  } else {
    milestone.status = 'IN_PROGRESS';
    project.updatedAt = new Date();
    createNotification({
      userId: request.submittedBy,
      type: 'MILESTONE_REJECTED',
      title: 'Milestone completion rejected',
      body: `"${milestone.title}" was not approved by the community. ${note}`,
      projectId: project.id,
      milestoneId: milestone.id,
      requestId: request.id,
    });
  }
}

// ── GET /api/moneyflow/:projectId/events ─────────────────────────────────────

router.get('/:projectId/events', (req, res) => {
  const events = getEventsForProject(req.params.projectId);
  res.json({ events, total: events.length });
});

// ── GET /api/moneyflow/:projectId/diagram ────────────────────────────────────

router.get('/:projectId/diagram', (req, res) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const events = getEventsForProject(req.params.projectId);

  const contributorMap = new Map<string, { id: string; name: string; mxn: number; eth: number }>();
  for (const inv of project.investments as any[]) {
    const uid = inv.investor?.id ?? 'unknown';
    const mxn = inv.mxn ?? Math.round((Number(BigInt(inv.amount)) / 1e18) * ETH_MXN);
    const eth = Number(BigInt(inv.amount)) / 1e18;
    if (!contributorMap.has(uid)) {
      contributorMap.set(uid, { id: uid, name: inv.investor?.name ?? `Investor ${contributorMap.size + 1}`, mxn: 0, eth: 0 });
    }
    const c = contributorMap.get(uid)!;
    c.mxn += mxn; c.eth += eth;
  }
  const contributors = Array.from(contributorMap.values());
  const totalMxn = contributors.reduce((s, c) => s + c.mxn, 0);
  const totalEth = contributors.reduce((s, c) => s + c.eth, 0);

  const completionRequests = getCompletionRequestsForProject(req.params.projectId);

  const milestones = project.milestones.map((m: any) => {
    const allocatedMxn = Math.round(totalMxn * m.fundingPercentage / 100);
    const allocatedEth = parseFloat((totalEth * m.fundingPercentage / 100).toFixed(6));
    const disbursed = events.filter(e => e.type === 'DISBURSE' && e.milestoneId === m.id).reduce((s, e) => s + e.mxnAmount, 0);
    const costs = getCostItemsForMilestone(m.id).reduce((s, c) => s + c.amountMxn, 0);
    const docs = getEvidenceForMilestone(m.id);
    const pendingRequest = completionRequests.find(r => r.milestoneId === m.id && r.status === 'PENDING_VOTES');
    return {
      id: m.id, title: m.title, status: m.status,
      fundingPct: m.fundingPercentage, allocatedMxn, allocatedEth,
      disbursedMxn: disbursed, loggedCostsMxn: costs,
      docsCount: docs.length,
      validatedDocsCount: docs.filter(d => d.aiAnalysis?.valid).length,
      completed: m.status === 'COMPLETED',
      pendingReviewId: pendingRequest?.id ?? null,
    };
  });

  const providerMap = new Map<string, { id: string; name: string; receivedMxn: number; milestones: string[] }>();
  for (const ev of events.filter(e => e.type === 'DISBURSE')) {
    const pid = ev.actorId;
    if (!providerMap.has(pid)) providerMap.set(pid, { id: pid, name: ev.actorName ?? pid, receivedMxn: 0, milestones: [] });
    const p = providerMap.get(pid)!;
    p.receivedMxn += ev.mxnAmount;
    if (ev.milestoneTitle && !p.milestones.includes(ev.milestoneTitle)) p.milestones.push(ev.milestoneTitle);
  }

  res.json({
    projectId: project.id, projectTitle: project.title,
    totalMxn, totalEth: parseFloat(totalEth.toFixed(6)),
    fundingGoalMxn: Math.round(Number(BigInt(project.fundingGoal)) / 1e18 * ETH_MXN),
    contributors, milestones,
    providers: Array.from(providerMap.values()),
    events: events.slice(0, 50),
  });
});

// ── GET /api/moneyflow/:projectId/contributor/:uid ───────────────────────────

router.get('/:projectId/contributor/:uid', requireAuth, (req: AuthRequest, res: Response) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const uid = req.params.uid;
  const myInvestments = (project.investments as any[]).filter(inv => inv.investor?.id === uid);
  const myTotalMxn = myInvestments.reduce((s, inv) => s + (inv.mxn ?? 0), 0);
  const totalMxn = (project.investments as any[]).reduce((s, inv) => s + (inv.mxn ?? 0), 0);
  const myPct = totalMxn > 0 ? myTotalMxn / totalMxn : 0;
  const milestoneSlices = (project.milestones as any[]).map(m => {
    const milestonePool = Math.round(totalMxn * m.fundingPercentage / 100);
    const mySlice = Math.round(milestonePool * myPct);
    const disbursedEvents = getEventsForProject(project.id).filter(e => e.type === 'DISBURSE' && e.milestoneId === m.id);
    const totalDisbursed = disbursedEvents.reduce((s, e) => s + e.mxnAmount, 0);
    return { milestoneId: m.id, milestoneTitle: m.title, status: m.status,
      milestonePoolMxn: milestonePool, mySliceMxn: mySlice,
      mySlicePct: parseFloat((myPct * 100).toFixed(2)), totalDisbursedMxn: totalDisbursed,
      myDisbursedMxn: Math.round(totalDisbursed * myPct) };
  });
  res.json({ userId: uid, projectId: project.id, myTotalInvestedMxn: myTotalMxn,
    myPoolSharePct: parseFloat((myPct * 100).toFixed(2)), milestoneSlices,
    investments: myInvestments.map(inv => ({ id: inv.id, mxn: inv.mxn ?? 0, eth: Number(BigInt(inv.amount)) / 1e18, createdAt: inv.createdAt })) });
});

// ── POST /api/moneyflow/:projectId/milestones/:mid/costs ─────────────────────

router.post('/:projectId/milestones/:mid/costs', requireAuth, (req: AuthRequest, res: Response) => {
  const { description, amountMxn, category } = req.body;
  if (!description || !amountMxn) return res.status(400).json({ error: 'Missing description or amountMxn' });
  const providerProfile = require('../data/simStore').getProviderUserProfile?.(req.user!.id);
  const item = addCostItem({
    milestoneId: req.params.mid, projectId: req.params.projectId,
    providerId: req.user!.id,
    providerName: providerProfile?.companyName ?? req.user!.email ?? 'Provider',
    description, amountMxn: Number(amountMxn), category: category ?? 'other', date: new Date(),
  });
  res.status(201).json({ item });
});

// ── GET /api/moneyflow/:projectId/milestones/:mid/costs ──────────────────────

router.get('/:projectId/milestones/:mid/costs', (req, res) => {
  const items = getCostItemsForMilestone(req.params.mid);
  res.json({ items, total: items.reduce((s, c) => s + c.amountMxn, 0) });
});

// ── POST /api/moneyflow/:projectId/milestones/:mid/documents ─────────────────
// Saves doc + runs AI validation against logged cost items

router.post('/:projectId/milestones/:mid/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  const { filename, mimeType, sizeBytes, dataBase64 } = req.body;
  if (!filename || !mimeType) return res.status(400).json({ error: 'Missing filename or mimeType' });
  const allowed = ['application/pdf', 'text/xml', 'application/xml', 'image/jpeg', 'image/png'];
  if (!allowed.includes(mimeType) && !filename.toLowerCase().endsWith('.xml')) {
    return res.status(400).json({ error: 'Only PDF, XML (CFDI), or image files allowed' });
  }

  const doc = addEvidenceDoc({
    milestoneId: req.params.mid, projectId: req.params.projectId,
    uploadedBy: req.user!.id, filename, mimeType, sizeBytes: sizeBytes ?? 0,
    dataBase64: dataBase64 ?? undefined, uploadedAt: new Date(), validated: false,
  });

  // Run AI validation asynchronously against logged costs
  const costItems = getCostItemsForMilestone(req.params.mid);
  validateDocument(filename, mimeType, dataBase64, costItems)
    .then(analysis => { doc.aiAnalysis = analysis; })
    .catch(err => logger.error('[moneyflow] AI doc validation error', { err }));

  logger.info('[moneyflow] evidence doc uploaded', { id: doc.id, filename });
  res.status(201).json({ doc, message: 'Document uploaded. AI analysis running in background.' });
});

// ── GET /api/moneyflow/:projectId/milestones/:mid/documents ──────────────────

router.get('/:projectId/milestones/:mid/documents', (req, res) => {
  const docs = getEvidenceForMilestone(req.params.mid).map(d => ({ ...d, dataBase64: undefined }));
  res.json({ docs });
});

// ── POST /api/moneyflow/:projectId/milestones/:mid/complete ───────────────────
// Creates a CompletionRequest and moves milestone to EVIDENCE_REVIEW

router.post('/:projectId/milestones/:mid/complete', requireAuth, (req: AuthRequest, res: Response) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const milestone = (project.milestones as any[]).find(m => m.id === req.params.mid);
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  if (milestone.status === 'COMPLETED') return res.status(400).json({ error: 'Milestone already completed' });

  const docs = getEvidenceForMilestone(req.params.mid);
  if (docs.length === 0) return res.status(400).json({ error: 'At least one evidence document is required' });

  // Check for existing pending request
  const existing = getCompletionRequestsForProject(req.params.projectId)
    .find(r => r.milestoneId === req.params.mid && (r.status === 'PENDING_VOTES' || r.status === 'OWNER_REVIEW'));
  if (existing) return res.status(409).json({ error: 'A completion request is already pending for this milestone', requestId: existing.id });

  const costs = getCostItemsForMilestone(req.params.mid);
  const totalCostMxn = costs.reduce((s, c) => s + c.amountMxn, 0) || (req.body.amountMxn ?? 0);
  const providerProfile = require('../data/simStore').getProviderUserProfile?.(req.user!.id);
  const submitterName = providerProfile?.companyName ?? req.user!.email ?? 'Provider';

  const eligibleVoters = countEligibleVoters(project);
  const status = eligibleVoters < 5 ? 'OWNER_REVIEW' : 'PENDING_VOTES';

  const request = addCompletionRequest({
    projectId: project.id, milestoneId: milestone.id, milestoneTitle: milestone.title,
    submittedBy: req.user!.id, submitterName, totalCostMxn, status, submittedAt: new Date(),
  });

  milestone.status = 'EVIDENCE_REVIEW';
  project.updatedAt = new Date();

  // Notify all investors to review
  notifyInvestors(project, {
    type: 'COMPLETION_SUBMITTED',
    title: `Review needed: ${milestone.title}`,
    body: `${submitterName} submitted completion evidence for "${milestone.title}" in ${project.title}. Your vote is needed.`,
    projectId: project.id, milestoneId: milestone.id, requestId: request.id,
  });

  // Notify project owner if owner review needed
  if (status === 'OWNER_REVIEW') {
    createNotification({
      userId: project.planner?.id ?? (project as any).plannerId,
      type: 'EVIDENCE_REVIEW',
      title: `Owner approval needed: ${milestone.title}`,
      body: `${submitterName} submitted completion for "${milestone.title}". Fewer than 5 investors — your approval is required.`,
      projectId: project.id, milestoneId: milestone.id, requestId: request.id,
    });
  }

  logger.info('[moneyflow] completion request created', { requestId: request.id, status });
  res.status(201).json({
    request,
    message: status === 'OWNER_REVIEW'
      ? 'Completion request submitted. Project owner approval required (fewer than 5 investors).'
      : `Completion request submitted. Community vote open. ${eligibleVoters} eligible voters. Threshold: ${eligibleVoters >= 10 ? '75%' : '66.7% (2:1)'}.`,
    eligibleVoters,
    threshold: eligibleVoters >= 10 ? 75 : 66.7,
  });
});

// ── GET /api/moneyflow/:projectId/completion-requests ────────────────────────

router.get('/:projectId/completion-requests', (req, res) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const requests = getCompletionRequestsForProject(req.params.projectId);
  const eligibleVoters = countEligibleVoters(project);
  const threshold = eligibleVoters >= 10 ? 75 : eligibleVoters >= 5 ? 66.7 : null;
  const enriched = requests.map(r => {
    const votes = getEvidenceVotesForRequest(r.id);
    const docs = getEvidenceForMilestone(r.milestoneId).map(d => ({ ...d, dataBase64: undefined }));
    const costs = getCostItemsForMilestone(r.milestoneId);
    return {
      ...r,
      votes: votes.map(v => ({ ...v })),
      approveCount: votes.filter(v => v.vote === 'APPROVE').length,
      rejectCount: votes.filter(v => v.vote === 'REJECT').length,
      totalVotes: votes.length,
      docs, costs, eligibleVoters, threshold,
    };
  });
  res.json({ requests: enriched, eligibleVoters, threshold });
});

// ── GET /api/moneyflow/:projectId/completion-requests/:reqId ─────────────────

router.get('/:projectId/completion-requests/:reqId', (req, res) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const request = getCompletionRequest(req.params.reqId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  const votes = getEvidenceVotesForRequest(request.id);
  const docs = getEvidenceForMilestone(request.milestoneId).map(d => ({ ...d, dataBase64: undefined }));
  const costs = getCostItemsForMilestone(request.milestoneId);
  const eligibleVoters = countEligibleVoters(project);
  const threshold = eligibleVoters >= 10 ? 75 : 66.7;
  res.json({
    request, votes,
    approveCount: votes.filter(v => v.vote === 'APPROVE').length,
    rejectCount: votes.filter(v => v.vote === 'REJECT').length,
    totalVotes: votes.length,
    docs, costs, eligibleVoters, threshold,
  });
});

// ── POST /api/moneyflow/:projectId/completion-requests/:reqId/vote ────────────

router.post('/:projectId/completion-requests/:reqId/vote', requireAuth, (req: AuthRequest, res: Response) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const request = getCompletionRequest(req.params.reqId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'PENDING_VOTES') return res.status(400).json({ error: `Request is not open for voting (status: ${request.status})` });

  const { vote, reason, voterName } = req.body;
  if (vote !== 'APPROVE' && vote !== 'REJECT') return res.status(400).json({ error: 'vote must be APPROVE or REJECT' });

  const result = castEvidenceVote({
    requestId: request.id, projectId: project.id, milestoneId: request.milestoneId,
    voterId: req.user!.id, voterName: voterName ?? req.user!.email ?? 'Community member',
    vote, reason: reason ?? undefined, createdAt: new Date(),
  });
  if (!result.ok) return res.status(409).json({ error: result.error });

  // Check if threshold met
  const eligibleVoters = countEligibleVoters(project);
  const resolution = resolveCompletionVoting(request.id, eligibleVoters);
  const milestone = (project.milestones as any[]).find(m => m.id === request.milestoneId);

  if (resolution.status === 'APPROVED' || resolution.status === 'REJECTED') {
    applyResolution(project, milestone, request, resolution.status,
      resolution.status === 'APPROVED'
        ? `Approved with ${resolution.approveCount}/${resolution.approveCount + resolution.rejectCount} votes (${resolution.threshold}% threshold).`
        : `Rejected: insufficient approval (${resolution.approveCount}/${resolution.approveCount + resolution.rejectCount} votes).`
    );
  }

  res.json({
    vote: result.vote,
    resolution,
    message: resolution.status === 'APPROVED'
      ? 'Vote recorded. Threshold reached — milestone approved and payment released!'
      : resolution.status === 'REJECTED'
      ? 'Vote recorded. Threshold not met — milestone completion rejected.'
      : `Vote recorded. ${resolution.approveCount} approve, ${resolution.rejectCount} reject. Waiting for more votes.`,
  });
});

// ── POST /api/moneyflow/:projectId/completion-requests/:reqId/owner-decide ───

router.post('/:projectId/completion-requests/:reqId/owner-decide', requireAuth, (req: AuthRequest, res: Response) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const ownerId = project.planner?.id ?? (project as any).plannerId;
  if (req.user!.id !== ownerId) return res.status(403).json({ error: 'Only the project owner can make this decision' });

  const request = getCompletionRequest(req.params.reqId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'OWNER_REVIEW' && request.status !== 'PENDING_VOTES') {
    return res.status(400).json({ error: `Request already resolved (status: ${request.status})` });
  }

  const { decision, note } = req.body;
  if (decision !== 'APPROVE' && decision !== 'REJECT') return res.status(400).json({ error: 'decision must be APPROVE or REJECT' });

  const milestone = (project.milestones as any[]).find(m => m.id === request.milestoneId);
  applyResolution(project, milestone, request, decision, note ?? `Owner decision: ${decision}`);

  res.json({ request, message: decision === 'APPROVE' ? 'Milestone approved by owner. Payment released.' : 'Milestone rejected by owner.' });
});

export default router;
