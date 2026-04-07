/**
 * /api/profile — Provider profile and service definition
 *
 * GET  /api/profile/provider                           — get provider profile for current user
 * PUT  /api/profile/provider                           — upsert provider profile fields
 * POST /api/profile/provider/services                  — create a new service + start AI chat
 * POST /api/profile/provider/services/:serviceId/chat  — AI chat turn to define the service
 * PATCH /api/profile/provider/services/:serviceId      — update service fields directly
 */
import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getProviderUserProfile,
  upsertProviderUserProfile,
  addProviderService,
  updateProviderService,
  ProviderService,
} from '../data/simStore';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

/** Extract the first balanced JSON object from a string (handles nested braces). */
function extractJsonObject(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

const SERVICE_SYSTEM = `You are a service definition assistant for Espacio Bosques — a community project platform in Bosques de las Lomas, CDMX.

A provider (contractor or professional) wants to register a service they offer for community projects. Help them articulate it precisely so it can be matched to project requirements and used to create bids.

Through conversation, collect:
1. Service name — short, professional title (e.g., "LED Electrical Installation", "Landscape Architecture")
2. What they actually do — specific tasks, scope, process
3. Deliverables — what the client receives (reports, completed work, certifications, etc.)
4. Typical price range in MXN — can be per project, per unit, or hourly
5. Any relevant certifications or experience they want to highlight

Rules:
- Ask one thing at a time, conversationally
- Be concise — one or two sentences max per response
- When you have all 5 points with enough detail, say "Perfecto, I have everything I need. Ready to save this service?"
- When complete, output ONLY JSON: {"ready": true, "service": {"name": "...", "description": "...", "deliverables": ["..."], "typicalPriceMxn": "...", "highlights": "..."}}`;

// ── GET /api/profile/provider ─────────────────────────────────────────

router.get('/provider', requireAuth, (req: AuthRequest, res: Response) => {
  const profile = getProviderUserProfile(req.user!.id);
  res.json({ profile });
});

// ── PUT /api/profile/provider ─────────────────────────────────────────

router.put('/provider', requireAuth, (req: AuthRequest, res: Response) => {
  const { enabled, companyName, specialty, rfc } = req.body;
  const updates: any = {};
  if (enabled !== undefined) updates.enabled = Boolean(enabled);
  if (companyName !== undefined) updates.companyName = String(companyName);
  if (specialty !== undefined) updates.specialty = String(specialty);
  if (rfc !== undefined) updates.rfc = String(rfc);

  const profile = upsertProviderUserProfile(req.user!.id, updates);
  logger.info('[profile] provider profile updated', { userId: req.user!.id });
  res.json({ profile });
});

// ── POST /api/profile/provider/services ──────────────────────────────

router.post('/provider/services', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  // Check that provider profile exists and is enabled
  const profile = getProviderUserProfile(userId);
  if (!profile || !profile.enabled) {
    return res.status(403).json({ error: 'Enable your provider profile first' });
  }

  const serviceId = `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Start AI chat with an introductory message
  const introMessage = { role: 'assistant' as const, content: "Hi! I'll help you define a service for your provider profile. Let's start — what's the name of the service you'd like to register? A short, professional title works best (e.g., \"LED Electrical Installation\" or \"Landscape Architecture\")." };

  const newService: ProviderService = {
    id: serviceId,
    name: '',
    description: '',
    deliverables: [],
    typicalPriceMxn: '',
    chatMessages: [introMessage],
    finalized: false,
    createdAt: new Date().toISOString(),
  };

  const updatedProfile = addProviderService(userId, newService);
  logger.info('[profile] service created', { userId, serviceId });

  res.status(201).json({ service: newService, profile: updatedProfile });
});

// ── POST /api/profile/provider/services/:serviceId/chat ──────────────

router.post('/provider/services/:serviceId/chat', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { serviceId } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: 'Missing message' });

  const profile = getProviderUserProfile(userId);
  if (!profile) return res.status(404).json({ error: 'Provider profile not found' });

  const service = profile.services.find(s => s.id === serviceId);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const newUserMsg = { role: 'user' as const, content: message };
  const history = [...service.chatMessages, newUserMsg];

  try {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SERVICE_SYSTEM,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    });

    const text = (response.content.find(b => b.type === 'text') as any)?.text ?? '';
    const assistantMsg = { role: 'assistant' as const, content: text };
    const updatedMessages = [...history, assistantMsg];

    // Check if AI signals readiness — use brace-balanced extractor (regex fails on nested JSON)
    let ready = false;
    let serviceData: any = null;
    if (text.includes('"ready"') && text.includes('true')) {
      const parsed = extractJsonObject(text);
      if (parsed?.ready && parsed?.service) {
        ready = true;
        serviceData = parsed.service;
      }
    }

    // Save updated chat history
    updateProviderService(userId, serviceId, { chatMessages: updatedMessages });

    // If ready, auto-update the service fields
    if (ready && serviceData) {
      updateProviderService(userId, serviceId, {
        name: serviceData.name || service.name,
        description: serviceData.description || service.description,
        deliverables: Array.isArray(serviceData.deliverables) ? serviceData.deliverables : service.deliverables,
        typicalPriceMxn: serviceData.typicalPriceMxn || service.typicalPriceMxn,
        chatMessages: updatedMessages,
      });
    }

    logger.info('[profile] service chat turn', { userId, serviceId, ready });
    res.json({ message: text, ready, service: serviceData });
  } catch (err: any) {
    logger.error('[profile] service chat failed', { error: err.message });
    res.status(500).json({ error: 'AI error', details: err.message });
  }
});

// ── PATCH /api/profile/provider/services/:serviceId ──────────────────

router.patch('/provider/services/:serviceId', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { serviceId } = req.params;

  const service = updateProviderService(userId, serviceId, req.body);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  logger.info('[profile] service updated', { userId, serviceId });
  res.json({ service });
});

export default router;
