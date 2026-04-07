/**
 * /api/test/* — Simulation-mode test harness.
 *
 * NEVER mounted in production. Only active when SIMULATION_MODE=true.
 *
 * Endpoints:
 *   GET  /api/test              → list all endpoints with usage
 *   GET  /api/test/state        → dump simStore (projects + investments)
 *   POST /api/test/invest       → create a sim investment
 *   POST /api/test/reset        → wipe all sim investments (keeps seed funding)
 */
import { Router, Request, Response } from 'express';
import { DEMO_PROJECTS, addSimInvestment, getSimUserInvestments, addSimBalance, getSimBalance } from '../data/simStore';
import { SIM_PROVIDERS, updateProviderStatus } from '../data/providers';
import { getQuote } from '../services/bitso';

const router = Router();

const DEMO_USER_ID = 'demo-test-user';

/* ── GET /api/test ─────────────────────────────────────────────── */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    note: '⚠️  Simulation mode only — never active in production',
    base: 'http://localhost:3001/api/test',
    endpoints: [
      {
        method: 'GET',
        path: '/api/test/state',
        description: 'Dump all projects with funding % and recent investments',
      },
      {
        method: 'POST',
        path: '/api/test/invest',
        description: 'Create a simulated investment',
        body: {
          projectId: 'string (optional, defaults to demo-project-001)',
          mxn: 'number (optional, defaults to 100 — minimum)',
          userId: 'string (optional, defaults to demo-test-user)',
        },
        example: `curl -s -X POST http://localhost:3001/api/test/invest \\
  -H 'Content-Type: application/json' \\
  -d '{"mxn": 100}'`,
      },
      {
        method: 'POST',
        path: '/api/test/add-balance',
        description: 'Credit MXN balance to a user',
        body: {
          userId: 'string (optional, defaults to demo-test-user)',
          mxn: 'number (positive to add, negative to subtract)',
        },
        example: `curl -s -X POST http://localhost:3001/api/test/add-balance \\
  -H 'Content-Type: application/json' \\
  -d '{"mxn": 5000}'`,
      },
      {
        method: 'POST',
        path: '/api/test/reset',
        description: 'Wipe all sim-user investments (seed funding stays)',
        example: `curl -s -X POST http://localhost:3001/api/test/reset`,
      },
      {
        method: 'GET',
        path: '/api/test/providers',
        description: 'List all sim providers with document counts and status',
        example: `curl -s http://localhost:3001/api/test/providers | jq '.'`,
      },
      {
        method: 'POST',
        path: '/api/test/providers/:id/verify',
        description: 'Mark a provider as VERIFIED',
        example: `curl -s -X POST http://localhost:3001/api/test/providers/prov-002/verify`,
      },
    ],
  });
});

/* ── GET /api/test/state ───────────────────────────────────────── */
router.get('/state', (_req: Request, res: Response) => {
  const ONE_ETH = BigInt('1000000000000000000');

  const projects = DEMO_PROJECTS.map((p) => {
    const goal = BigInt(p.fundingGoal);
    const raised = BigInt(p.fundingRaised);
    const pct = goal > 0n ? Number((raised * 100n) / goal) : 0;

    const simInvestments = p.investments
      .filter((inv) => inv.investor.id !== 'u1' && inv.investor.id !== 'u3') // skip pre-seed crowd
      .map((inv) => ({
        id: inv.id,
        userId: inv.investor.id,
        eth: (Number(BigInt(inv.amount)) / 1e18).toFixed(4),
        mxn: (inv as any).mxn ?? null,
        at: (inv as any).createdAt ?? null,
      }));

    return {
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status,
      fundingPct: pct,
      raisedEth: (Number(raised) / 1e18).toFixed(4),
      goalEth: (Number(goal) / 1e18).toFixed(4),
      investmentCount: p._count.investments,
      simInvestments,
    };
  });

  res.json({
    projects,
    balanceNote: 'Use POST /api/test/add-balance to credit MXN to a user. Default: $10,000 MXN per new user.',
  });
});

/* ── POST /api/test/invest ─────────────────────────────────────── */
router.post('/invest', async (req: Request, res: Response) => {
  const projectId: string = req.body.projectId ?? 'demo-project-001';
  const mxn: number = Math.max(100, Number(req.body.mxn ?? 100));
  const userId: string = req.body.userId ?? DEMO_USER_ID;

  try {
    // Get a real (simulated) Bitso quote so the rate is realistic
    const order = await getQuote(mxn);

    const ok = addSimInvestment(projectId, order.eth, mxn, userId);
    if (!ok) {
      return res.status(404).json({ error: `Project not found: ${projectId}` });
    }

    const history = getSimUserInvestments(userId);

    return res.json({
      ok: true,
      investment: {
        projectId,
        userId,
        mxn,
        eth: order.eth,
        rate: order.rate,
      },
      userHistory: history,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/test/add-balance ───────────────────────────────── */
router.post('/add-balance', (req: Request, res: Response) => {
  const userId: string = req.body.userId ?? DEMO_USER_ID;
  const mxn: number = Number(req.body.mxn ?? 5000);
  if (isNaN(mxn)) return res.status(400).json({ error: 'mxn must be a number' });

  const newBalance = addSimBalance(userId, mxn);
  return res.json({ ok: true, userId, added: mxn, balance: newBalance });
});

/* ── GET /api/test/providers ───────────────────────────────────── */
router.get('/providers', (_req: Request, res: Response) => {
  const list = SIM_PROVIDERS.map(({ documents, ...p }) => ({
    ...p,
    documentCount: documents.length,
    documents: documents.map(d => ({ id: d.id, type: d.type, filename: d.filename, uploadedAt: d.uploadedAt })),
  }));
  res.json({ providers: list, total: list.length });
});

/* ── POST /api/test/providers/:id/verify ──────────────────────── */
router.post('/providers/:id/verify', (req: Request, res: Response) => {
  const provider = updateProviderStatus(req.params.id, 'VERIFIED');
  if (!provider) return res.status(404).json({ error: `Provider not found: ${req.params.id}` });
  res.json({ ok: true, provider: { id: provider.id, name: provider.name, status: provider.status } });
});

/* ── POST /api/test/reset ──────────────────────────────────────── */
router.post('/reset', (_req: Request, res: Response) => {
  // Remove all non-seed investments from every project
  const SEED_IDS = new Set(['inv1', 'inv3', 'inv-sim-seed-1']);

  let removed = 0;
  for (const project of DEMO_PROJECTS) {
    const before = project.investments.length;
    project.investments = project.investments.filter((inv) => SEED_IDS.has(inv.id));
    removed += before - project.investments.length;

    // Recalculate fundingRaised from remaining investments
    let raised = 0n;
    for (const inv of project.investments) {
      raised += BigInt(inv.amount);
    }
    project.fundingRaised = raised.toString();
    project._count.investments = project.investments.length;
    project.updatedAt = new Date();
  }

  res.json({ ok: true, removed });
});

export default router;
