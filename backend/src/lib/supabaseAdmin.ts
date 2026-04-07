/**
 * Supabase admin client (service role) — used for storage operations.
 * Never expose this key to the frontend.
 */
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const STORAGE_BUCKET = 'espacio-bosques-docs';

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_client && supabaseUrl && supabaseKey) {
    _client = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Ensure the storage bucket exists. Creates it on first call if missing.
 * Private bucket — files served via signed URLs only.
 */
export async function ensureBucket(): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) {
    logger.warn('[storage] Supabase not configured — skipping bucket check');
    return;
  }
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some(b => b.name === STORAGE_BUCKET);
    if (!exists) {
      const { error } = await client.storage.createBucket(STORAGE_BUCKET, { public: false });
      if (error) throw error;
      logger.info(`[storage] Created bucket: ${STORAGE_BUCKET}`);
    }
  } catch (err: any) {
    logger.error('[storage] ensureBucket failed', { error: err.message });
  }
}

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the storage path, or null on failure.
 */
export async function uploadFile(
  path: string,
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    logger.error('[storage] upload failed', { path, error: error.message });
    return null;
  }
  return path;
}

/**
 * Generate a short-lived signed URL for a stored file (1 hour).
 */
export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) return null;
  return data.signedUrl;
}
