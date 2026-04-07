/**
 * SAT RFC Registry Validation
 *
 * Checks whether an RFC is registered in the SAT padron de contribuyentes
 * by submitting to the SAT SIAT form at:
 *   https://agsc.siat.sat.gob.mx/PTSC/ValidaRFC/index.jsf
 *
 * NOTE: The SAT does NOT expose a JSON API for RFC lookup — this scrapes their
 * web form. It confirms that the RFC *exists* and is *active* in their registry,
 * but does NOT return the registered name (that is private data requiring CIEC/e.firma).
 *
 * Name validation is handled separately via structural RFC derivation (lib/rfc.ts).
 * The RFC algorithm itself is the government standard — if your name produces
 * those 4 letters + date, the RFC structurally belongs to you.
 *
 * Degrades gracefully: if SAT service is unavailable, returns 'service_unavailable'
 * and registration is allowed through with structural-only validation.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const SAT_SIAT_URL = 'https://agsc.siat.sat.gob.mx/PTSC/ValidaRFC/index.jsf';
const TIMEOUT_MS = 12000;

export type SatRfcStatus = 'found' | 'not_found' | 'service_unavailable';

export interface SatRfcResult {
  registered: boolean;
  status: SatRfcStatus;
  message?: string;
}

/** Extract a hidden input value from HTML by name attribute */
function extractHiddenInput(html: string, name: string): string | null {
  // Match: name="..." value="..." or value="..." name="..."
  const re = new RegExp(`name=["']${name.replace('.', '\\.')}["'][^>]*value=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`value=["']([^"']*)["'][^>]*name=["']${name.replace('.', '\\.')}["']`, 'i');
  const m = html.match(re) || html.match(re2);
  return m ? m[1] : null;
}

/** Extract the ViewState and all form field names from a JSF page */
function parseJsfForm(html: string): {
  viewState: string | null;
  rfcFieldName: string | null;
  submitFieldName: string | null;
  formId: string | null;
} {
  // ViewState
  const viewState = extractHiddenInput(html, 'javax.faces.ViewState');

  // Find the RFC text input field name — looks for an input type=text inside the form
  const rfcMatch = html.match(/<input[^>]+type=["']text["'][^>]+name=["']([^"']+)["']/i)
    || html.match(/<input[^>]+name=["']([^"']*RFC[^"']*)["'][^>]+type=["']text["']/i);
  const rfcFieldName = rfcMatch ? rfcMatch[1] : null;

  // Find submit button name
  const submitMatch = html.match(/<input[^>]+type=["']submit["'][^>]+name=["']([^"']+)["']/i)
    || html.match(/<input[^>]+name=["']([^"']+)["'][^>]+type=["']submit["']/i);
  const submitFieldName = submitMatch ? submitMatch[1] : null;

  // Form ID
  const formIdMatch = html.match(/<form[^>]+id=["']([^"']+)["']/i);
  const formId = formIdMatch ? formIdMatch[1] : null;

  return { viewState, rfcFieldName, submitFieldName, formId };
}

export async function validateRfcWithSat(rfc: string): Promise<SatRfcResult> {
  const upper = rfc.toUpperCase().trim();

  try {
    // ── Step 1: GET the SAT SIAT page to obtain ViewState ────────────────────
    const getResponse = await axios.get(SAT_SIAT_URL, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9',
      },
    });

    const html: string = getResponse.data;
    const cookies = getResponse.headers['set-cookie']?.join('; ') || '';
    const { viewState, rfcFieldName, submitFieldName, formId } = parseJsfForm(html);

    if (!viewState) {
      logger.warn('[satRfc] could not extract ViewState from SAT page');
      return { registered: false, status: 'service_unavailable', message: 'SAT form structure changed' };
    }

    // ── Step 2: Build POST body ───────────────────────────────────────────────
    // JSF standard: form submits all its inputs + ViewState
    // Typical field naming for this form: "j_id0:formValidaRFC:RFC"
    const effectiveRfcField = rfcFieldName || 'j_id0:formValidaRFC:RFC';
    const effectiveSubmitField = submitFieldName || 'j_id0:formValidaRFC:j_id11';
    const effectiveFormId = formId || 'j_id0:formValidaRFC';

    const params = new URLSearchParams();
    params.append(effectiveFormId, effectiveFormId);
    params.append(effectiveRfcField, upper);
    params.append(effectiveSubmitField, 'Validar');
    params.append('javax.faces.ViewState', viewState);

    // ── Step 3: POST and parse response ──────────────────────────────────────
    const postResponse = await axios.post(SAT_SIAT_URL, params.toString(), {
      timeout: TIMEOUT_MS,
      maxRedirects: 3,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': SAT_SIAT_URL,
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-MX,es;q=0.9',
        'Origin': 'https://agsc.siat.sat.gob.mx',
      },
    });

    const result: string = postResponse.data;

    // SAT returns: "RFC XXXX999999XXX se encuentra registrado en el padrón"
    // or: "El RFC no se encuentra registrado" / "NO ENCONTRADO"
    const foundPattern = /se encuentra (registrado|en el padr[oó]n)/i;
    const notFoundPattern = /no se encuentra|no encontrado|no registrado|no existe/i;

    if (foundPattern.test(result)) {
      logger.info(`[satRfc] RFC ${upper} found in SAT registry`);
      return { registered: true, status: 'found' };
    } else if (notFoundPattern.test(result)) {
      logger.info(`[satRfc] RFC ${upper} NOT found in SAT registry`);
      return { registered: false, status: 'not_found', message: 'RFC no encontrado en el padrón del SAT' };
    }

    // Response received but couldn't parse a definitive answer
    logger.warn(`[satRfc] ambiguous response for RFC ${upper}`);
    return { registered: false, status: 'service_unavailable', message: 'No se pudo interpretar la respuesta del SAT' };

  } catch (err: any) {
    // Network error, timeout, CORS, or SAT is down
    logger.warn(`[satRfc] SAT validation failed for ${upper}: ${err.message}`);
    return {
      registered: false,
      status: 'service_unavailable',
      message: `Servicio SAT no disponible: ${err.message}`,
    };
  }
}
