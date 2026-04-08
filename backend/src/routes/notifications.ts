/**
 * Notifications routes
 *
 * GET   /api/notifications         — user's notifications (auth required)
 * PATCH /api/notifications/:id/read
 * POST  /api/notifications/mark-all-read
 */
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getNotificationsForUser, SIM_NOTIFICATIONS } from '../data/governance';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const notifs = getNotificationsForUser(req.user!.id);
  const unreadCount = notifs.filter(n => !n.read).length;
  res.json({ notifications: notifs, unreadCount });
});

router.patch('/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
  const notif = SIM_NOTIFICATIONS.find(n => n.id === req.params.id && n.userId === req.user!.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  notif.read = true;
  res.json({ ok: true });
});

router.post('/mark-all-read', requireAuth, (req: AuthRequest, res: Response) => {
  let count = 0;
  for (const n of SIM_NOTIFICATIONS) {
    if (n.userId === req.user!.id && !n.read) { n.read = true; count++; }
  }
  res.json({ ok: true, marked: count });
});

export default router;
