/**
 * /api/providers — Provider registry
 *
 * Providers are contractors/vendors who receive milestone disbursements.
 * Every disbursement requires a verified CFDI 4.0 factura from the provider.
 *
 * Routes:
 *   GET    /api/providers              — list all providers
 *   GET    /api/providers/:id          — get provider + documents
 *   POST   /api/providers              — create provider (admin)
 *   PATCH  /api/providers/:id/status   — verify/reject provider (admin)
 *   POST   /api/providers/:id/documents — upload document (multipart/form-data)
 *   GET    /api/providers/:id/documents/:docId/url — get signed download URL
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { SIMULATION_MODE } from '../config/mode';
import {
  SIM_PROVIDERS,
  getProvider,
  addProvider,
  updateProviderStatus,
  addProviderDocument,
  validateClabe,
  validateRfc,
  parseCfdiXml,
  ProviderStatus,
  DocType,
} from '../data/providers';
import { uploadFile, signedUrl, ensureBucket, STORAGE_BUCKET } from '../lib/supabaseAdmin';

const router = Router();

// Multer — memory storage, 10MB limit, accept PDF/XML/images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/xml', 'application/xml', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// Ensure storage bucket exists on first request
let bucketReady = false;
async function ensureStorage() {
  if (!bucketReady) {
    await ensureBucket();
    bucketReady = true;
  }
}

// ── GET /api/providers ───────────────────────────────────────────────────────

router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { status, specialty } = req.query;
  let providers = [...SIM_PROVIDERS];
  if (status) providers = providers.filter(p => p.status === status);
  if (specialty) providers = providers.filter(p => p.specialty.toLowerCase().includes((specialty as string).toLowerCase()));

  // Strip documents from list view for brevity
  const list = providers.map(({ documents, ...p }) => ({
    ...p,
    documentCount: documents.length,
  }));

  res.json({ providers: list, total: list.length });
});

// ── GET /api/providers/:id ───────────────────────────────────────────────────

router.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const provider = getProvider(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  res.json({ provider });
});

// ── POST /api/providers ──────────────────────────────────────────────────────

router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { name, tipoPersona, rfc, curp, clabe, email, phone, specialty } = req.body;

  if (!name || !tipoPersona || !rfc || !clabe || !email || !specialty) {
    return res.status(400).json({ error: 'Missing required fields: name, tipoPersona, rfc, clabe, email, specialty' });
  }

  // Validate RFC format
  const rfcValidation = validateRfc(rfc, tipoPersona);
  if (!rfcValidation.valid) {
    return res.status(400).json({ error: rfcValidation.error });
  }

  // Validate CLABE checksum
  const clabeValidation = validateClabe(clabe);
  if (!clabeValidation.valid) {
    return res.status(400).json({ error: clabeValidation.error });
  }

  // Check for duplicate RFC
  const existing = SIM_PROVIDERS.find(p => p.rfc.toUpperCase() === rfc.toUpperCase());
  if (existing) {
    return res.status(409).json({ error: `Provider with RFC ${rfc.toUpperCase()} already exists (id: ${existing.id})` });
  }

  const provider = addProvider({ name, tipoPersona, rfc: rfc.toUpperCase(), curp, clabe, email, phone, specialty });
  logger.info('[providers] Created provider', { id: provider.id, rfc: provider.rfc });
  res.status(201).json({ provider });
});

// ── PATCH /api/providers/:id/status ─────────────────────────────────────────

router.patch('/:id/status', requireAuth, (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status: ProviderStatus };
  const allowed: ProviderStatus[] = ['PENDING', 'VERIFIED', 'REJECTED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const provider = updateProviderStatus(req.params.id, status);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  logger.info('[providers] Status updated', { id: provider.id, status });
  res.json({ provider });
});

// ── POST /api/providers/:id/documents ────────────────────────────────────────

router.post(
  '/:id/documents',
  requireAuth,
  upload.single('file') as any,
  async (req: AuthRequest, res: Response) => {
    const provider = getProvider(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { type } = req.body as { type?: DocType };
    if (!type) return res.status(400).json({ error: 'Missing field: type (CFDI_XML | CFDI_PDF | CONTRACT | PHOTO | ID_DOCUMENT)' });

    const validTypes: DocType[] = ['CFDI_XML', 'CFDI_PDF', 'CONTRACT', 'PHOTO', 'ID_DOCUMENT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    // Parse CFDI XML if applicable
    let cfdiData = undefined;
    if (type === 'CFDI_XML') {
      const xmlContent = req.file.buffer.toString('utf-8');
      cfdiData = parseCfdiXml(xmlContent) ?? undefined;
      if (!cfdiData) {
        return res.status(422).json({ error: 'Could not parse CFDI XML — check format and try again' });
      }
      logger.info('[providers] CFDI parsed', { uuid: cfdiData.uuid, emisor: cfdiData.emisorRfc, total: cfdiData.total });
    }

    // Upload to Supabase Storage (or skip in simulation if Supabase not configured)
    const storagePath = `providers/${provider.id}/${type}/${Date.now()}_${req.file.originalname}`;
    let uploadedPath = storagePath;

    if (!SIMULATION_MODE() || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      await ensureStorage();
      const result = await uploadFile(storagePath, req.file.buffer, req.file.mimetype);
      if (!result) {
        return res.status(500).json({ error: 'Storage upload failed — check Supabase configuration' });
      }
      uploadedPath = result;
    } else {
      logger.warn('[providers] Simulation mode + no Supabase — document metadata saved, file not persisted to storage');
    }

    const doc = addProviderDocument(provider.id, {
      type,
      filename: req.file.originalname,
      storagePath: uploadedPath,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      cfdiData,
    });

    if (!doc) return res.status(500).json({ error: 'Failed to save document metadata' });

    logger.info('[providers] Document uploaded', { providerId: provider.id, docId: doc.id, type });
    res.status(201).json({ document: doc });
  }
);

// ── GET /api/providers/:id/documents/:docId/url ──────────────────────────────

router.get('/:id/documents/:docId/url', requireAuth, async (req: AuthRequest, res: Response) => {
  const provider = getProvider(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const doc = provider.documents.find(d => d.id === req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const url = await signedUrl(doc.storagePath);
  if (!url) {
    // In full simulation mode (no Supabase), return a placeholder
    return res.json({ url: null, note: 'Signed URL not available in simulation mode without Supabase' });
  }

  res.json({ url, expiresIn: 3600 });
});

export default router;
