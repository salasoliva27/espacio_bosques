/**
 * Money flow + milestone completion routes
 *
 * GET  /api/moneyflow/:projectId/events          — full investment event log
 * GET  /api/moneyflow/:projectId/diagram         — structured data for money flow diagram
 * GET  /api/moneyflow/:projectId/contributor/:uid — per-contributor slice breakdown
 *
 * POST /api/moneyflow/:projectId/milestones/:mid/costs        — log a cost item
 * GET  /api/moneyflow/:projectId/milestones/:mid/costs        — list cost items
 * POST /api/moneyflow/:projectId/milestones/:mid/documents    — upload evidence doc (sim: metadata only)
 * GET  /api/moneyflow/:projectId/milestones/:mid/documents    — list evidence docs
 * POST /api/moneyflow/:projectId/milestones/:mid/complete     — mark milestone complete (requires docs)
 */
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  addCostItem, getCostItemsForMilestone,
  addEvidenceDoc, getEvidenceForMilestone,
  addInvestmentEvent, getEventsForProject,
  INVESTMENT_EVENTS,
} from '../data/governance';
import { DEMO_PROJECTS } from '../data/simStore';
import { logger } from '../utils/logger';

const router = Router();

const ETH_MXN = 65000;

// ── GET /api/moneyflow/:projectId/events ─────────────────────────────────────

router.get('/:projectId/events', (req, res) => {
  const events = getEventsForProject(req.params.projectId);
  res.json({ events, total: events.length });
});

// ── GET /api/moneyflow/:projectId/diagram ────────────────────────────────────
// Returns structured nodes + flows for the money flow diagram.

router.get('/:projectId/diagram', (req, res) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const events = getEventsForProject(req.params.projectId);

  // Aggregate per-investor contributions
  const contributorMap = new Map<string, { id: string; name: string; mxn: number; eth: number }>();
  for (const inv of project.investments as any[]) {
    const uid = inv.investor?.id ?? 'unknown';
    const mxn = inv.mxn ?? Math.round((Number(BigInt(inv.amount)) / 1e18) * ETH_MXN);
    const eth = Number(BigInt(inv.amount)) / 1e18;
    if (!contributorMap.has(uid)) {
      contributorMap.set(uid, { id: uid, name: inv.investor?.name ?? `Investor ${contributorMap.size + 1}`, mxn: 0, eth: 0 });
    }
    const c = contributorMap.get(uid)!;
    c.mxn += mxn;
    c.eth += eth;
  }
  const contributors = Array.from(contributorMap.values());
  const totalMxn = contributors.reduce((s, c) => s + c.mxn, 0);
  const totalEth = contributors.reduce((s, c) => s + c.eth, 0);

  // Per-milestone allocation (by fundingPercentage)
  const milestones = project.milestones.map((m: any) => {
    const allocatedMxn = Math.round(totalMxn * m.fundingPercentage / 100);
    const allocatedEth = parseFloat((totalEth * m.fundingPercentage / 100).toFixed(6));
    const disbursed = events
      .filter(e => e.type === 'DISBURSE' && e.milestoneId === m.id)
      .reduce((s, e) => s + e.mxnAmount, 0);
    const costs = getCostItemsForMilestone(m.id).reduce((s, c) => s + c.amountMxn, 0);
    const docs = getEvidenceForMilestone(m.id);
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      fundingPct: m.fundingPercentage,
      allocatedMxn,
      allocatedEth,
      disbursedMxn: disbursed,
      loggedCostsMxn: costs,
      docsCount: docs.length,
      completed: m.status === 'COMPLETED',
    };
  });

  // Provider disbursements from events
  const providerMap = new Map<string, { id: string; name: string; receivedMxn: number; milestones: string[] }>();
  for (const ev of events.filter(e => e.type === 'DISBURSE')) {
    const pid = ev.actorId;
    if (!providerMap.has(pid)) {
      providerMap.set(pid, { id: pid, name: ev.actorName ?? pid, receivedMxn: 0, milestones: [] });
    }
    const p = providerMap.get(pid)!;
    p.receivedMxn += ev.mxnAmount;
    if (ev.milestoneTitle && !p.milestones.includes(ev.milestoneTitle)) p.milestones.push(ev.milestoneTitle);
  }

  res.json({
    projectId: project.id,
    projectTitle: project.title,
    totalMxn,
    totalEth: parseFloat(totalEth.toFixed(6)),
    fundingGoalMxn: Math.round(Number(BigInt(project.fundingGoal)) / 1e18 * ETH_MXN),
    contributors,
    milestones,
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
    return {
      milestoneId: m.id,
      milestoneTitle: m.title,
      status: m.status,
      milestonePoolMxn: milestonePool,
      mySliceMxn: mySlice,
      mySlicePct: parseFloat((myPct * 100).toFixed(2)),
      totalDisbursedMxn: totalDisbursed,
      myDisbursedMxn: Math.round(totalDisbursed * myPct),
    };
  });

  res.json({
    userId: uid,
    projectId: project.id,
    myTotalInvestedMxn: myTotalMxn,
    myPoolSharePct: parseFloat((myPct * 100).toFixed(2)),
    milestoneSlices,
    investments: myInvestments.map(inv => ({
      id: inv.id,
      mxn: inv.mxn ?? 0,
      eth: Number(BigInt(inv.amount)) / 1e18,
      createdAt: inv.createdAt,
    })),
  });
});

// ── POST /api/moneyflow/:projectId/milestones/:mid/costs ─────────────────────

router.post('/:projectId/milestones/:mid/costs', requireAuth, (req: AuthRequest, res: Response) => {
  const { description, amountMxn, category } = req.body;
  if (!description || !amountMxn) return res.status(400).json({ error: 'Missing description or amountMxn' });
  const providerProfile = require('../data/simStore').getProviderUserProfile?.(req.user!.id);
  const item = addCostItem({
    milestoneId: req.params.mid,
    projectId: req.params.projectId,
    providerId: req.user!.id,
    providerName: providerProfile?.companyName ?? req.user!.email ?? 'Provider',
    description,
    amountMxn: Number(amountMxn),
    category: category ?? 'other',
    date: new Date(),
  });
  logger.info('[moneyflow] cost item logged', { id: item.id, amountMxn: item.amountMxn });
  res.status(201).json({ item });
});

// ── GET /api/moneyflow/:projectId/milestones/:mid/costs ──────────────────────

router.get('/:projectId/milestones/:mid/costs', (req, res) => {
  const items = getCostItemsForMilestone(req.params.mid);
  const total = items.reduce((s, c) => s + c.amountMxn, 0);
  res.json({ items, total });
});

// ── POST /api/moneyflow/:projectId/milestones/:mid/documents ─────────────────
// Sim mode: store only metadata (no actual file bytes needed for POC)

router.post('/:projectId/milestones/:mid/documents', requireAuth, (req: AuthRequest, res: Response) => {
  const { filename, mimeType, sizeBytes, dataBase64 } = req.body;
  if (!filename || !mimeType) return res.status(400).json({ error: 'Missing filename or mimeType' });
  const allowed = ['application/pdf', 'text/xml', 'application/xml'];
  if (!allowed.includes(mimeType)) return res.status(400).json({ error: 'Only PDF or XML (CFDI) files allowed' });
  const doc = addEvidenceDoc({
    milestoneId: req.params.mid,
    projectId: req.params.projectId,
    uploadedBy: req.user!.id,
    filename,
    mimeType,
    sizeBytes: sizeBytes ?? 0,
    dataBase64: dataBase64 ?? undefined,
    uploadedAt: new Date(),
    validated: false,
  });
  logger.info('[moneyflow] evidence doc uploaded', { id: doc.id, filename });
  res.status(201).json({ doc });
});

// ── GET /api/moneyflow/:projectId/milestones/:mid/documents ──────────────────

router.get('/:projectId/milestones/:mid/documents', (req, res) => {
  const docs = getEvidenceForMilestone(req.params.mid).map(d => ({ ...d, dataBase64: undefined }));
  res.json({ docs });
});

// ── PATCH /api/moneyflow/:projectId/milestones/:mid/validate-doc/:docId ──────

router.patch('/:projectId/milestones/:mid/validate-doc/:docId', requireAuth, (req: AuthRequest, res: Response) => {
  const { SIM_EVIDENCE_DOCS } = require('../data/governance');
  const doc = SIM_EVIDENCE_DOCS.find((d: any) => d.id === req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  doc.validated = true;
  res.json({ doc });
});

// ── POST /api/moneyflow/:projectId/milestones/:mid/complete ──────────────────

router.post('/:projectId/milestones/:mid/complete', requireAuth, (req: AuthRequest, res: Response) => {
  const project = DEMO_PROJECTS.find(p => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const milestone = (project.milestones as any[]).find(m => m.id === req.params.mid);
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

  const docs = getEvidenceForMilestone(req.params.mid);
  if (docs.length === 0) return res.status(400).json({ error: 'At least one evidence document is required to complete a milestone' });

  const { disbursedToId, disbursedToName, amountMxn } = req.body;
  milestone.status = 'COMPLETED';
  project.updatedAt = new Date();

  // Record disbursement event
  if (amountMxn && disbursedToId) {
    const ethAmt = amountMxn / ETH_MXN;
    const weiAmt = BigInt(Math.round(ethAmt * 1e12)) * BigInt(1e6);
    addInvestmentEvent({
      type: 'DISBURSE',
      projectId: project.id,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      actorId: disbursedToId,
      actorName: disbursedToName ?? 'Provider',
      mxnAmount: amountMxn,
      ethAmount: ethAmt,
      weiAmount: weiAmt.toString(),
      bitsoOrderId: `DISBURSE-${Date.now()}`,
      note: `Milestone "${milestone.title}" completed`,
      createdAt: new Date(),
    });
  }

  logger.info('[moneyflow] milestone completed', { milestoneId: milestone.id, projectId: project.id });
  res.json({ milestone, message: 'Milestone marked as completed' });
});

export default router;
