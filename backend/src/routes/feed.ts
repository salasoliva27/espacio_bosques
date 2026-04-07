/**
 * /api/feed — Social activity feed
 *
 * GET  /api/feed                       — recent projects with like/comment counts
 * GET  /api/projects/:id/comments      — list comments for a project
 * POST /api/projects/:id/comments      — post a comment
 * POST /api/projects/:id/like          — toggle like
 * GET  /api/projects/:id/likes         — get like count + whether current user liked
 * GET  /api/search?q=xxx               — search projects + providers
 */
import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { SIMULATION_MODE } from '../config/mode';
import {
  DEMO_PROJECTS,
  getProjectComments,
  addProjectComment,
  toggleLike,
  getLikes,
  SimComment,
} from '../data/simStore';
import { SIM_PROVIDERS } from '../data/providers';

const router = Router();

const toEthFloat = (wei: string) => {
  try { return Number(BigInt(wei)) / 1e18; } catch { return 0; }
};
const fundingPct = (raised: string, goal: string) => {
  try {
    const r = Number(BigInt(raised)), g = Number(BigInt(goal));
    return g === 0 ? 0 : Math.min(Math.round((r / g) * 100), 100);
  } catch { return 0; }
};

// ── Feed ──────────────────────────────────────────────────────────────
router.get('/', (req: Request, res: Response) => {
  if (!SIMULATION_MODE()) {
    return res.status(501).json({ error: 'Feed only available in simulation mode' });
  }
  const userId = (req as any).user?.id;
  const feed = DEMO_PROJECTS.map(p => {
    const comments = getProjectComments(p.id);
    const likes = getLikes(p.id, userId);
    return {
      id: p.id,
      title: p.title,
      summary: p.summary,
      category: p.category,
      status: p.status,
      fundingGoal: p.fundingGoal,
      fundingRaised: p.fundingRaised,
      fundingPct: fundingPct(p.fundingRaised, p.fundingGoal),
      ethRaised: toEthFloat(p.fundingRaised),
      ethGoal: toEthFloat(p.fundingGoal),
      investorCount: p._count.investments,
      milestoneCount: p.milestones.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      commentCount: comments.length,
      recentComments: comments.slice(0, 3),
      likes: likes.count,
      liked: likes.liked,
    };
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ feed });
});

// ── Comments ──────────────────────────────────────────────────────────
router.get('/projects/:id/comments', (req: Request, res: Response) => {
  if (!SIMULATION_MODE()) return res.status(501).json({ error: 'Simulation only' });
  const comments = getProjectComments(req.params.id);
  res.json({ comments });
});

router.post('/projects/:id/comments', requireAuth, (req: AuthRequest, res: Response) => {
  if (!SIMULATION_MODE()) return res.status(501).json({ error: 'Simulation only' });
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text is required' });
  }
  if (text.trim().length > 500) {
    return res.status(400).json({ error: 'Comment too long (max 500 chars)' });
  }
  const project = DEMO_PROJECTS.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const comment: SimComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId: req.params.id,
    userId: req.user!.id,
    walletAddress: '0xsimulated',
    username: req.user!.email?.split('@')[0] || 'Resident',
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  addProjectComment(comment);
  logger.info('Comment posted', { projectId: req.params.id, userId: req.user!.id });
  res.status(201).json({ comment });
});

// ── Likes ─────────────────────────────────────────────────────────────
router.post('/projects/:id/like', requireAuth, (req: AuthRequest, res: Response) => {
  if (!SIMULATION_MODE()) return res.status(501).json({ error: 'Simulation only' });
  const project = DEMO_PROJECTS.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const result = toggleLike(req.params.id, req.user!.id);
  res.json(result);
});

router.get('/projects/:id/likes', (req: Request, res: Response) => {
  if (!SIMULATION_MODE()) return res.status(501).json({ error: 'Simulation only' });
  const userId = (req as any).user?.id;
  res.json(getLikes(req.params.id, userId));
});

// ── Search ────────────────────────────────────────────────────────────
router.get('/search', (req: Request, res: Response) => {
  if (!SIMULATION_MODE()) return res.status(501).json({ error: 'Simulation only' });
  const raw = (req.query.q as string) ?? '';
  const q = raw.trim().toLowerCase();
  if (q.length < 2) return res.json({ projects: [], providers: [] });

  const projects = DEMO_PROJECTS
    .filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    )
    .map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status,
      fundingPct: fundingPct(p.fundingRaised, p.fundingGoal),
    }));

  const providers = SIM_PROVIDERS
    .filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q) ||
      (p.rfc && p.rfc.toLowerCase().includes(q))
    )
    .map(p => ({ id: p.id, name: p.name, specialty: p.specialty, status: p.status }));

  res.json({ projects, providers, query: raw });
});

export default router;
