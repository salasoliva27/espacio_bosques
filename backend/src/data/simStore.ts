/**
 * In-memory simulation store.
 * Shared between routes/projects.ts and routes/invest.ts so that
 * investments recorded during a session are reflected on the dashboard.
 *
 * Goals are intentionally small (1 ETH = ~65,000 MXN) so that a typical
 * 1,000 MXN investment (~0.015 ETH) produces ~1.5% visible progress.
 */

// 1 ETH in wei
const ETH = BigInt('1000000000000000000');

export interface SimProject {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  fundingGoal: string;
  fundingRaised: string;
  createdAt: Date;
  updatedAt: Date;
  planner: { id: string; walletAddress: string; role: string };
  milestones: {
    id: string;
    title: string;
    status: string;
    fundingPercentage: number;
    description: string;
    durationDays: number;
  }[];
  investments: { id: string; amount: string; investor: { id: string; walletAddress: string } }[];
  telemetry: { id: string; timestamp: Date; data: Record<string, unknown> }[];
  reports: unknown[];
  _count: { investments: number };
}

export const DEMO_PROJECTS: SimProject[] = [
  {
    id: 'demo-project-001',
    title: 'Smart Security Network — Paseo de las Palmas',
    summary:
      'Deploy a mesh of AI-powered security cameras with real-time incident alerts across Paseo de las Palmas and connecting streets. Footage is processed on-device; no cloud storage. Residents receive push alerts for unusual activity and can review clips via the Espacio Bosques app.',
    category: 'INFRASTRUCTURE',
    status: 'ACTIVE',
    // Goal: 1 ETH — 1,000 MXN ≈ 0.015 ETH ≈ 1.5% progress per investment
    fundingGoal: (ETH).toString(),
    fundingRaised: ((ETH * BigInt(37)) / BigInt(100)).toString(), // 37% pre-funded
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-04-01'),
    planner: { id: 'planner-001', walletAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', role: 'PLANNER' },
    milestones: [
      { id: 'm1', title: 'Hardware procurement & site survey', status: 'COMPLETED', fundingPercentage: 30, description: 'Purchase 12 edge-AI cameras (Ambarella SoC); map optimal mounting points across 8 intersections', durationDays: 30 },
      { id: 'm2', title: 'Installation & fiber backbone', status: 'IN_PROGRESS', fundingPercentage: 40, description: 'Install cameras, conduit, and the PoE fiber ring connecting all nodes to the colonia server room', durationDays: 60 },
      { id: 'm3', title: 'AI model deployment & resident app', status: 'PENDING', fundingPercentage: 30, description: 'Deploy on-device anomaly detection model; launch resident alert app with opt-in notifications', durationDays: 45 },
    ],
    investments: [
      { id: 'inv1', amount: ((ETH * BigInt(37)) / BigInt(100)).toString(), investor: { id: 'u1', walletAddress: '0xsim001' } },
      // Pre-seeded sim-user investment (500 MXN ≈ 0.0075 ETH)
      { id: 'inv-sim-seed-1', amount: (ETH * BigInt(75) / BigInt(10000)).toString(), investor: { id: 'sim-user', walletAddress: '0xsimulated' }, mxn: 500, createdAt: new Date('2026-03-10') } as any,
    ],
    telemetry: [{ id: 't1', timestamp: new Date(), data: { uptimePercent: 98.5, batteryPercent: 87 } }],
    reports: [],
    _count: { investments: 1 },
  },
  {
    id: 'demo-project-002',
    title: 'Pocket Park — Presa Angostura & Explanada',
    summary:
      'Convert the unused median lot at Presa Angostura and Explanada into a landscaped pocket park with native CDMX plants, benches, and evening lighting. Designed for the daily walkers and dog owners already using the space informally.',
    category: 'COMMUNITY',
    status: 'ACTIVE',
    fundingGoal: (ETH).toString(),
    fundingRaised: ((ETH * BigInt(21)) / BigInt(100)).toString(), // 21% pre-funded
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-04-02'),
    planner: { id: 'planner-002', walletAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', role: 'PLANNER' },
    milestones: [
      { id: 'm4', title: 'Design approval & permits', status: 'COMPLETED', fundingPercentage: 25, description: 'Landscape architect renders, SEDUVI permit, HOA sign-off', durationDays: 21 },
      { id: 'm5', title: 'Hardscape & irrigation', status: 'PENDING', fundingPercentage: 35, description: 'Grading, stone paths, solar drip irrigation system for planted areas', durationDays: 30 },
      { id: 'm6', title: 'Planting & lighting', status: 'PENDING', fundingPercentage: 40, description: 'Native species planting (tepozán, colorín, salvia mexicana), LED post lighting, final handover', durationDays: 45 },
    ],
    investments: [
      { id: 'inv3', amount: ((ETH * BigInt(21)) / BigInt(100)).toString(), investor: { id: 'u3', walletAddress: '0xsim003' } },
    ],
    telemetry: [],
    reports: [],
    _count: { investments: 1 },
  },
];

export interface SimUserInvestment {
  id: string;
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  ethAmount: number;   // ETH float
  mxnAmount: number;   // MXN (approximate)
  createdAt: Date;
}

// Rate used for MXN display — approximate Bitso sandbox rate
const ETH_MXN_RATE = 65000;

// ── Simulated MXN balances ─────────────────────────────────────────
// In production this would be the user's Bitso wallet balance (fetched via Bitso API).
// Platform NEVER holds real funds — balance is always Bitso-custodied.
const DEFAULT_SIM_BALANCE_MXN = 10_000; // every new sim user starts with $10,000 MXN
const userBalances = new Map<string, number>(); // userId → MXN balance

export function getSimBalance(userId: string): number {
  if (!userBalances.has(userId)) userBalances.set(userId, DEFAULT_SIM_BALANCE_MXN);
  return userBalances.get(userId)!;
}

export function addSimBalance(userId: string, mxn: number): number {
  const current = getSimBalance(userId);
  const next = Math.max(0, current + mxn);
  userBalances.set(userId, next);
  return next;
}

/** Returns false if insufficient funds. */
export function deductSimBalance(userId: string, mxn: number): boolean {
  const current = getSimBalance(userId);
  if (current < mxn) return false;
  userBalances.set(userId, current - mxn);
  return true;
}

/**
 * Return all investments for a specific user across all projects.
 * userId should be the Supabase user ID from req.user.id.
 */
export function getSimUserInvestments(userId: string): SimUserInvestment[] {
  const results: SimUserInvestment[] = [];
  for (const project of DEMO_PROJECTS) {
    for (const inv of project.investments) {
      if (inv.investor.id !== userId) continue;
      const ethAmount = Number(BigInt(inv.amount)) / 1e18;
      const mxnAmount = (inv as any).mxn ?? Math.round(ethAmount * ETH_MXN_RATE);
      results.push({
        id: inv.id,
        projectId: project.id,
        projectTitle: project.title,
        projectCategory: project.category,
        ethAmount,
        mxnAmount,
        createdAt: (inv as any).createdAt ?? project.updatedAt,
      });
    }
  }
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Record a simulated investment against a project.
 * Converts ETH float → wei string and adds it to fundingRaised.
 * Returns false if project not found.
 */
export function addSimInvestment(projectId: string, ethAmount: number, mxnAmount?: number, userId?: string): boolean {
  const project = DEMO_PROJECTS.find((p) => p.id === projectId);
  if (!project) return false;

  // Convert ETH float to wei (1 ETH = 1e18 wei)
  const weiAmount = BigInt(Math.round(ethAmount * 1e12)) * BigInt(1e6);
  project.fundingRaised = (BigInt(project.fundingRaised) + weiAmount).toString();
  project.updatedAt = new Date();

  const inv: any = {
    id: `sim-inv-${Date.now()}`,
    amount: weiAmount.toString(),
    investor: { id: userId ?? 'sim-user', walletAddress: '0xsimulated' },
    mxn: mxnAmount ?? Math.round(ethAmount * ETH_MXN_RATE),
    createdAt: new Date(),
  };
  project.investments.push(inv);
  project._count.investments += 1;

  return true;
}
