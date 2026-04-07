/**
 * In-memory simulation store with JSON persistence.
 * Shared between routes so that investments + projects survive a restart.
 *
 * Goals are intentionally small (1 ETH = ~65,000 MXN) so that a typical
 * 1,000 MXN investment (~0.015 ETH) produces ~1.5% visible progress.
 */

import * as fs from 'fs';
import * as path from 'path';

// 1 ETH in wei
const ETH = BigInt('1000000000000000000');

const DATA_FILE = path.join(__dirname, '../../sim-data.json');

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
  requiredRoles?: { id: string; role: string; description: string; milestoneId?: string }[];
  investments: { id: string; amount: string; investor: { id: string; walletAddress: string } }[];
  telemetry: { id: string; timestamp: Date; data: Record<string, unknown> }[];
  reports: unknown[];
  _count: { investments: number };
}

export interface SimComment {
  id: string;
  projectId: string;
  userId: string;
  walletAddress: string;
  username: string;
  text: string;
  createdAt: string; // ISO string for easy serialization
}

export const DEMO_PROJECTS: SimProject[] = [
  {
    id: 'demo-project-001',
    title: 'Smart Security Network — Paseo de las Palmas',
    summary:
      'Deploy a mesh of AI-powered security cameras with real-time incident alerts across Paseo de las Palmas and connecting streets. Footage is processed on-device; no cloud storage. Residents receive push alerts for unusual activity and can review clips via the Espacio Bosques app.',
    category: 'INFRASTRUCTURE',
    status: 'ACTIVE',
    fundingGoal: (ETH).toString(),
    fundingRaised: ((ETH * BigInt(37)) / BigInt(100)).toString(),
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-04-01'),
    planner: { id: 'planner-001', walletAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', role: 'PLANNER' },
    milestones: [
      { id: 'm1', title: 'Hardware procurement & site survey', status: 'COMPLETED', fundingPercentage: 30, description: 'Purchase 12 edge-AI cameras (Ambarella SoC); map optimal mounting points across 8 intersections', durationDays: 30 },
      { id: 'm2', title: 'Installation & fiber backbone', status: 'IN_PROGRESS', fundingPercentage: 40, description: 'Install cameras, conduit, and the PoE fiber ring connecting all nodes to the colonia server room', durationDays: 60 },
      { id: 'm3', title: 'AI model deployment & resident app', status: 'PENDING', fundingPercentage: 30, description: 'Deploy on-device anomaly detection model; launch resident alert app with opt-in notifications', durationDays: 45 },
    ],
    requiredRoles: [
      { id: 'rr-001-1', role: 'Network Engineer', description: 'Design and deploy the PoE fiber mesh connecting all camera nodes to the colonia server room', milestoneId: 'm2' },
      { id: 'rr-001-2', role: 'AI/ML Engineer', description: 'Deploy on-device anomaly detection model and integrate with resident alert app', milestoneId: 'm3' },
      { id: 'rr-001-3', role: 'Security Installer', description: 'Physical installation of 12 edge-AI cameras at approved mounting points across 8 intersections', milestoneId: 'm2' },
    ],
    investments: [
      { id: 'inv1', amount: ((ETH * BigInt(37)) / BigInt(100)).toString(), investor: { id: 'u1', walletAddress: '0xsim001' } },
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
    fundingRaised: ((ETH * BigInt(21)) / BigInt(100)).toString(),
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-04-02'),
    planner: { id: 'planner-002', walletAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', role: 'PLANNER' },
    milestones: [
      { id: 'm4', title: 'Design approval & permits', status: 'COMPLETED', fundingPercentage: 25, description: 'Landscape architect renders, SEDUVI permit, HOA sign-off', durationDays: 21 },
      { id: 'm5', title: 'Hardscape & irrigation', status: 'PENDING', fundingPercentage: 35, description: 'Grading, stone paths, solar drip irrigation system for planted areas', durationDays: 30 },
      { id: 'm6', title: 'Planting & lighting', status: 'PENDING', fundingPercentage: 40, description: 'Native species planting (tepozán, colorín, salvia mexicana), LED post lighting, final handover', durationDays: 45 },
    ],
    requiredRoles: [
      { id: 'rr-002-1', role: 'Landscape Architect', description: 'Final planting plan for native CDMX species (tepozán, colorín, salvia mexicana) and LED post lighting layout', milestoneId: 'm6' },
      { id: 'rr-002-2', role: 'Civil Contractor', description: 'Grading, stone path construction, and solar drip irrigation system installation', milestoneId: 'm5' },
    ],
    investments: [
      { id: 'inv3', amount: ((ETH * BigInt(21)) / BigInt(100)).toString(), investor: { id: 'u3', walletAddress: '0xsim003' } },
    ],
    telemetry: [],
    reports: [],
    _count: { investments: 1 },
  },
  {
    id: 'demo-project-003',
    title: 'LED Lighting — Paseo de las Palmas Corridor',
    summary:
      'Comprehensive LED retrofit of the 1.2 km Paseo de las Palmas stretch between Presa Angostura and Presa Falcón. Replaces sodium vapor lamps with smart LEDs, reduces energy consumption 60%, and improves pedestrian safety during evening hours.',
    category: 'INFRASTRUCTURE',
    status: 'ACTIVE',
    fundingGoal: (ETH).toString(),
    fundingRaised: ((ETH * BigInt(54)) / BigInt(100)).toString(),
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-04-05'),
    planner: { id: 'planner-003', walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', role: 'PLANNER' },
    milestones: [
      { id: 'ml1', title: 'Site survey & permit filing', status: 'COMPLETED', fundingPercentage: 20, description: 'Lux measurements, Alcaldía Miguel Hidalgo permit, CFE connection approval', durationDays: 35 },
      { id: 'ml2', title: 'Procurement', status: 'COMPLETED', fundingPercentage: 40, description: 'LED fixtures (NOM-certified), smart dimmer modules, mounting hardware', durationDays: 21 },
      { id: 'ml3', title: 'Installation', status: 'IN_PROGRESS', fundingPercentage: 30, description: 'Install 15 retrofit fixtures + 3 new posts in gap areas; connect to CFE grid', durationDays: 28 },
      { id: 'ml4', title: 'Testing & handover', status: 'PENDING', fundingPercentage: 10, description: 'Municipal inspection, lux compliance, resident acceptance', durationDays: 14 },
    ],
    requiredRoles: [
      { id: 'rr-003-1', role: 'Electrical Contractor', description: 'Install 15 LED retrofit fixtures and 3 new posts; connect to CFE grid with NOM-certified components', milestoneId: 'ml3' },
      { id: 'rr-003-2', role: 'Municipal Liaison', description: 'Coordinate Alcaldía Miguel Hidalgo inspection, lux compliance certification, and resident acceptance documentation', milestoneId: 'ml4' },
    ],
    investments: [
      { id: 'inv4', amount: ((ETH * BigInt(54)) / BigInt(100)).toString(), investor: { id: 'u4', walletAddress: '0xsim004' } },
    ],
    telemetry: [],
    reports: [],
    _count: { investments: 4 },
  },
];

// ── Comments store ─────────────────────────────────────────────────────
const commentStore = new Map<string, SimComment[]>();

// Seed demo comments
commentStore.set('demo-project-001', [
  { id: 'c1', projectId: 'demo-project-001', userId: 'u2', walletAddress: '0xsim002', username: 'Vecino Bosques', text: 'Excelente proyecto, llevan semanas con la cámara en la esquina de Palmas sin funcionar.', createdAt: '2026-04-01T09:15:00.000Z' },
  { id: 'c2', projectId: 'demo-project-001', userId: 'u3', walletAddress: '0xsim003', username: 'Residente Explanada', text: 'Ya aporté 1,000 MXN. ¿Cuándo instalan las cámaras en Presa Falcón?', createdAt: '2026-04-02T14:30:00.000Z' },
]);
commentStore.set('demo-project-002', [
  { id: 'c3', projectId: 'demo-project-002', userId: 'u1', walletAddress: '0xsim001', username: 'Planificador Palmas', text: 'El diseño final ya fue aprobado por el arquitecto paisajista. ¡Iniciamos en 2 semanas!', createdAt: '2026-04-03T11:00:00.000Z' },
]);

// ── Persistence ───────────────────────────────────────────────────────

function loadPersistedData(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);

    if (Array.isArray(data.projects)) {
      for (const p of data.projects) {
        if (!DEMO_PROJECTS.find(d => d.id === p.id)) {
          DEMO_PROJECTS.push({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            investments: (p.investments || []).map((inv: any) => ({
              ...inv,
              createdAt: inv.createdAt ? new Date(inv.createdAt) : undefined,
            })),
          });
        }
      }
    }

    if (data.comments && typeof data.comments === 'object') {
      for (const [projectId, comments] of Object.entries(data.comments as Record<string, SimComment[]>)) {
        const existing = commentStore.get(projectId) ?? [];
        const existingIds = new Set(existing.map(c => c.id));
        const newComments = (comments as SimComment[]).filter(c => !existingIds.has(c.id));
        if (newComments.length > 0) {
          commentStore.set(projectId, [...existing, ...newComments]);
        }
      }
    }
  } catch {
    // Ignore load errors — start fresh
  }
}

export function persistData(): void {
  try {
    const userCreatedProjects = DEMO_PROJECTS.filter(p => p.id.startsWith('sim-'));
    const commentsObj: Record<string, SimComment[]> = {};
    commentStore.forEach((comments, projectId) => {
      commentsObj[projectId] = comments;
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ projects: userCreatedProjects, comments: commentsObj }, null, 2), 'utf8');
  } catch {
    // Ignore write errors
  }
}

/** Add a user-created sim project to the store and persist it. */
export function addSimProject(project: SimProject): void {
  DEMO_PROJECTS.unshift(project);
  persistData();
}

// ── Comments ──────────────────────────────────────────────────────────

export function getProjectComments(projectId: string): SimComment[] {
  return (commentStore.get(projectId) ?? []).slice().reverse(); // newest first
}

export function addProjectComment(comment: SimComment): void {
  const existing = commentStore.get(comment.projectId) ?? [];
  commentStore.set(comment.projectId, [...existing, comment]);
  persistData();
}

// ── Likes ─────────────────────────────────────────────────────────────
// projectId → Set of userIds who liked it
const likesStore = new Map<string, Set<string>>();

export function toggleLike(projectId: string, userId: string): { liked: boolean; count: number } {
  const likers = likesStore.get(projectId) ?? new Set<string>();
  if (likers.has(userId)) {
    likers.delete(userId);
  } else {
    likers.add(userId);
  }
  likesStore.set(projectId, likers);
  return { liked: likers.has(userId), count: likers.size };
}

export function getLikes(projectId: string, userId?: string): { count: number; liked: boolean } {
  const likers = likesStore.get(projectId) ?? new Set<string>();
  return { count: likers.size, liked: userId ? likers.has(userId) : false };
}

// ── Balances ──────────────────────────────────────────────────────────

export interface SimUserInvestment {
  id: string;
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  ethAmount: number;
  mxnAmount: number;
  createdAt: Date;
}

const ETH_MXN_RATE = 65000;
const DEFAULT_SIM_BALANCE_MXN = 10_000;
const userBalances = new Map<string, number>();

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

export function deductSimBalance(userId: string, mxn: number): boolean {
  const current = getSimBalance(userId);
  if (current < mxn) return false;
  userBalances.set(userId, current - mxn);
  return true;
}

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

export function addSimInvestment(projectId: string, ethAmount: number, mxnAmount?: number, userId?: string): boolean {
  const project = DEMO_PROJECTS.find((p) => p.id === projectId);
  if (!project) return false;

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

  persistData();
  return true;
}

// ── Provider User Profiles ────────────────────────────────────────────

export interface ProviderService {
  id: string;
  name: string;
  description: string;
  deliverables: string[];
  typicalPriceMxn: string;
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  finalized: boolean;
  createdAt: string;
}

export interface ProviderUserProfile {
  userId: string;
  enabled: boolean;
  companyName: string;
  specialty: string;
  rfc: string;
  services: ProviderService[];
  createdAt: string;
}

const providerProfileStore = new Map<string, ProviderUserProfile>();

export function getProviderUserProfile(userId: string): ProviderUserProfile | null {
  return providerProfileStore.get(userId) ?? null;
}

export function upsertProviderUserProfile(userId: string, data: Partial<Omit<ProviderUserProfile, 'userId'>>): ProviderUserProfile {
  const existing = providerProfileStore.get(userId) ?? {
    userId, enabled: false, companyName: '', specialty: '', rfc: '', services: [], createdAt: new Date().toISOString(),
  };
  const updated = { ...existing, ...data, userId };
  providerProfileStore.set(userId, updated);
  return updated;
}

export function addProviderService(userId: string, service: ProviderService): ProviderUserProfile {
  const profile = upsertProviderUserProfile(userId, {});
  profile.services.push(service);
  providerProfileStore.set(userId, profile);
  return profile;
}

export function updateProviderService(userId: string, serviceId: string, data: Partial<ProviderService>): ProviderService | null {
  const profile = providerProfileStore.get(userId);
  if (!profile) return null;
  const idx = profile.services.findIndex(s => s.id === serviceId);
  if (idx === -1) return null;
  profile.services[idx] = { ...profile.services[idx], ...data };
  return profile.services[idx];
}

export function deleteProviderService(userId: string, serviceId: string): boolean {
  const profile = providerProfileStore.get(userId);
  if (!profile) return false;
  const idx = profile.services.findIndex(s => s.id === serviceId);
  if (idx === -1) return false;
  profile.services.splice(idx, 1);
  return true;
}

// ── Init ──────────────────────────────────────────────────────────────
loadPersistedData();
