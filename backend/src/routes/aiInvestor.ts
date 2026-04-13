/**
 * AI Investor routes
 *
 * POST /api/ai-investor/start   — start the autonomous investment agent
 * POST /api/ai-investor/stop    — stop it
 * GET  /api/ai-investor/status  — current stats + persona balances
 * GET  /api/ai-investor/stream  — SSE stream of live investment events
 */
import { Router, Request, Response } from 'express';
import { startAgent, stopAgent, getAgentStatus, investorEmitter, InvestmentEvent } from '../services/aiInvestor';

const router = Router();

router.post('/start', (_req: Request, res: Response) => {
  const status = startAgent();
  res.json({ success: true, status });
});

router.post('/stop', (_req: Request, res: Response) => {
  const status = stopAgent();
  res.json({ success: true, status });
});

router.get('/status', (_req: Request, res: Response) => {
  res.json(getAgentStatus());
});

/**
 * GET /api/ai-investor/stream
 * Server-Sent Events — stays open, pushes events as they fire
 */
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send current status immediately on connect
  const current = getAgentStatus();
  res.write(`data: ${JSON.stringify({ type: 'status', stats: current, timestamp: new Date().toISOString() })}\n\n`);

  const handler = (event: InvestmentEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch { /* client disconnected */ }
  };

  investorEmitter.on('event', handler);

  // Keepalive every 25s to prevent proxy timeouts
  const keepalive = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(keepalive); }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepalive);
    investorEmitter.off('event', handler);
  });
});

export default router;
