/**
 * SAT Art. 69-B Blacklist — Contribuyentes con operaciones presuntamente inexistentes
 *
 * Source: https://www.sat.gob.mx (datos abiertos, updated monthly)
 * CSV URL: Listado_completo_69-B.csv (hosted on Azure blob, publicly accessible)
 *
 * Statuses in the list:
 *   Presunto           → SAT suspects, under review         → WARN (allow but flag)
 *   Definitivo         → SAT confirmed fraud                → BLOCK
 *   Desvirtuado        → Was on list, cleared by taxpayer   → PASS
 *   Sentencia Favorable → Court ruled in taxpayer's favor   → PASS
 *
 * The list is refreshed in memory every 24h. On startup it loads lazily on first check.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const BLACKLIST_URL =
  'https://wu1agsprosta001.blob.core.windows.net/agsc-publicaciones/Datos_abiertos/Documents_AGAFF/Listado_completo_69-B.csv';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TIMEOUT_MS = 30_000;

export type BlacklistStatus = 'clean' | 'presunto' | 'definitivo' | 'service_unavailable';

export interface BlacklistEntry {
  rfc: string;
  name: string;
  situation: string; // raw value from CSV
}

export interface BlacklistResult {
  status: BlacklistStatus;
  entry?: BlacklistEntry;
  listUpdatedAt?: Date;
}

// ── In-memory cache ───────────────────────────────────────────────────────────

let _cache: Map<string, BlacklistEntry> | null = null;
let _lastFetch: Date | null = null;
let _fetchInProgress: Promise<void> | null = null;

function needsRefresh(): boolean {
  if (!_cache || !_lastFetch) return true;
  return Date.now() - _lastFetch.getTime() > REFRESH_INTERVAL_MS;
}

// ── CSV parser ────────────────────────────────────────────────────────────────
// The SAT CSV is Windows-1252 encoded with a 3-row header.
// Row 1: long disclaimer, Row 2: title, Row 3: column headers, Row 4+: data.

function parseBlacklistCsv(raw: string): Map<string, BlacklistEntry> {
  const map = new Map<string, BlacklistEntry>();
  const lines = raw.split('\n');

  // Skip rows until we find the header row (contains "RFC")
  let dataStart = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('RFC') && lines[i].includes('Situaci')) {
      dataStart = i + 1;
      break;
    }
  }

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV fields may be quoted — simple split on comma works for RFC (never has commas)
    // Format: No,"RFC","Nombre del Contribuyente","Situación",...
    const fields = splitCsvLine(line);
    if (fields.length < 4) continue;

    const rfc = fields[1].replace(/"/g, '').trim().toUpperCase();
    const name = fields[2].replace(/"/g, '').trim();
    const situation = fields[3].replace(/"/g, '').trim();

    if (!rfc || rfc.length < 12) continue;

    map.set(rfc, { rfc, name, situation });
  }

  return map;
}

/** Split a CSV line respecting quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ── Fetch & load ──────────────────────────────────────────────────────────────

async function loadBlacklist(): Promise<void> {
  try {
    logger.info('[satBlacklist] downloading 69-B list from SAT...');
    const response = await axios.get(BLACKLIST_URL, {
      timeout: TIMEOUT_MS,
      responseType: 'arraybuffer', // get raw bytes for proper encoding
    });

    // SAT serves the CSV as Windows-1252 (latin1 superset)
    const decoded = Buffer.from(response.data).toString('latin1');
    _cache = parseBlacklistCsv(decoded);
    _lastFetch = new Date();
    logger.info(`[satBlacklist] loaded ${_cache.size} entries, updated ${_lastFetch.toISOString()}`);
  } catch (err: any) {
    logger.warn(`[satBlacklist] failed to load blacklist: ${err.message}`);
    // Keep stale cache if it exists — don't wipe it on transient error
    if (!_cache) _cache = new Map(); // empty cache so we don't retry on every request
  }
}

async function ensureLoaded(): Promise<void> {
  if (!needsRefresh()) return;
  if (_fetchInProgress) return _fetchInProgress;
  _fetchInProgress = loadBlacklist().finally(() => { _fetchInProgress = null; });
  return _fetchInProgress;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkBlacklist(rfc: string): Promise<BlacklistResult> {
  try {
    await ensureLoaded();
  } catch {
    // ensureLoaded swallows errors internally, but belt-and-suspenders
  }

  if (!_cache) {
    return { status: 'service_unavailable' };
  }

  const upper = rfc.toUpperCase().trim();
  const entry = _cache.get(upper);

  if (!entry) {
    return { status: 'clean', listUpdatedAt: _lastFetch ?? undefined };
  }

  const sit = entry.situation.toLowerCase();
  // Cleared statuses — not a concern
  if (sit.includes('desvirtu') || sit.includes('sentencia')) {
    return { status: 'clean', listUpdatedAt: _lastFetch ?? undefined };
  }
  // Definitivo = confirmed fraud
  if (sit.includes('definitivo')) {
    return { status: 'definitivo', entry, listUpdatedAt: _lastFetch ?? undefined };
  }
  // Presunto = suspected, under review
  if (sit.includes('presunto')) {
    return { status: 'presunto', entry, listUpdatedAt: _lastFetch ?? undefined };
  }

  return { status: 'clean', listUpdatedAt: _lastFetch ?? undefined };
}

/** Pre-warm the cache on server startup (non-blocking). */
export function warmBlacklist(): void {
  ensureLoaded().catch(() => {});
}

/** For test endpoints: return cache stats. */
export function blacklistStats() {
  return {
    loaded: _cache !== null,
    entries: _cache?.size ?? 0,
    lastFetch: _lastFetch?.toISOString() ?? null,
    nextRefreshIn: _lastFetch
      ? Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - _lastFetch.getTime()))
      : 0,
  };
}
