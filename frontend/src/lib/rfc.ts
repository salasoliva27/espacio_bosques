/**
 * Mexican RFC (Registro Federal de Contribuyentes) validation utilities.
 *
 * RFC for individuals (personas físicas): 13 characters
 *   [4 alpha][6 digits (YYMMDD)][3 alphanumeric homoclave]
 *
 * The 4-letter name portion is derived from:
 *   [0] First letter of primer apellido (paternal surname)
 *   [1] First internal vowel of primer apellido
 *   [2] First letter of segundo apellido (maternal surname)
 *   [3] First letter of primer nombre (first given name)
 *
 * SAT replaces certain 4-letter combinations with generic alternatives to
 * avoid offensive words (BACA→BAXO, BUEI→BUEX, etc.).
 *
 * Full SAT API validation is not available publicly. This module validates:
 *   1. Format (regex)
 *   2. Date validity (YYMMDD must be a real date)
 *   3. Name-RFC structural consistency (best-effort, doesn't require SAT API)
 */

const RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;

// Words SAT avoids due to offensive meaning (replaced with Xes)
const SAT_AVOID = new Set([
  'BACA','BAKA','BUEI','BUEY','CACA','CACO','CAGA','CAGO','CAKA','CAKO',
  'COGE','COGI','COJA','COJE','COJI','COJO','COLA','CULO','FALO','FETO',
  'GETA','GUEI','GUEY','JETA','JOTO','KACA','KACO','KAGA','KAGO','KAKA',
  'KAKO','KOGE','KOGI','KOJA','KOJE','KOJI','KOJO','KOLA','KULO','LELO',
  'LOCA','LOCO','LOKA','LOKO','MAME','MAMO','MEAR','MEAS','MEON','MIAR',
  'MION','MOCO','MOKO','MULA','MULO','NACA','NACO','PEDA','PEDO','PENE',
  'PIPI','PITO','POPO','PUTA','PUTO','QULO','RATA','ROBA','ROBE','ROBO',
  'RUIN','SENO','TETA','VACA','VAGA','VAGO','VAKA','VUEI','VUEY','WUEI','WUEY',
]);

export interface RfcValidationResult {
  valid: boolean;
  error?: string;
}

function normalizeText(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accent marks
    .replace(/[^A-ZÑ&\s]/g, '')
    .trim();
}

/** First internal vowel (vowel at position > 0) */
function firstInternalVowel(word: string): string {
  const vowels = 'AEIOUÁÉÍÓÚ';
  for (let i = 1; i < word.length; i++) {
    if (vowels.includes(word[i])) return word[i] === 'Á' ? 'A' : word[i] === 'É' ? 'E' : word[i] === 'Í' ? 'I' : word[i] === 'Ó' ? 'O' : word[i] === 'Ú' ? 'U' : word[i];
  }
  return 'X'; // no internal vowel → SAT uses X
}

/** Date validity check for the 6-digit date embedded in RFC */
function rfcDateValid(digits: string): boolean {
  // digits = YYMMDD
  const yy = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  // Full year: assume 1900s if yy > current 2-digit year, else 2000s
  const currentYY = new Date().getFullYear() % 100;
  const fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
  const date = new Date(fullYear, mm - 1, dd);
  return date.getMonth() === mm - 1 && date.getDate() === dd;
}

/**
 * Derive expected RFC name letters from a full name string.
 *
 * Mexican name format: "Nombre [Nombre2] ApellidoPaterno [ApellidoMaterno]"
 * This is best-effort — SAT uses complex rules for edge cases.
 *
 * Returns { letter0, letter1, letter2, letter3 } or null if parsing fails.
 */
function deriveRfcLetters(fullName: string): { letters: string; confidence: 'high' | 'low' } | null {
  const words = normalizeText(fullName).split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  // Particles to skip (de, del, la, los, etc.)
  const particles = new Set(['DE','DEL','LA','LAS','LOS','Y','MC','MAC','VON','VAN']);

  const meaningful = words.filter(w => !particles.has(w));
  if (meaningful.length < 2) return null;

  let apellidoPaterno: string;
  let apellidoMaterno: string;
  let nombre: string;

  if (meaningful.length === 2) {
    // "Nombre Apellido" — only one surname
    [nombre, apellidoPaterno] = meaningful;
    apellidoMaterno = 'X';
  } else if (meaningful.length === 3) {
    // Ambiguous: could be "Nombre Ap1 Ap2" or "N1 N2 Ap1"
    // Most common Mexican format: last two are surnames
    [nombre, apellidoPaterno, apellidoMaterno] = meaningful;
  } else {
    // 4+ words: assume first = nombre, second = apellidoPaterno, third = apellidoMaterno
    [nombre, apellidoPaterno, apellidoMaterno] = [meaningful[0], meaningful[meaningful.length - 2], meaningful[meaningful.length - 1]];
  }

  const l0 = apellidoPaterno[0];
  const l1 = firstInternalVowel(apellidoPaterno);
  const l2 = apellidoMaterno[0] ?? 'X';
  const l3 = nombre[0];

  // Check if SAT would replace these letters
  const candidate = l0 + l1 + l2 + l3;
  const letters = SAT_AVOID.has(candidate) ? candidate.slice(0, 3) + 'X' : candidate;

  return {
    letters,
    confidence: meaningful.length >= 3 ? 'high' : 'low',
  };
}

/**
 * Validate RFC format and consistency with the provided full name.
 * Does NOT validate against SAT's database — structural check only.
 */
export function validateRfc(rfc: string, fullName?: string): RfcValidationResult {
  const upper = rfc.toUpperCase().trim();

  if (!upper) return { valid: false, error: 'El RFC es requerido.' };
  if (upper.length !== 13) return { valid: false, error: 'El RFC de persona física debe tener 13 caracteres.' };
  if (!RFC_REGEX.test(upper)) return { valid: false, error: 'Formato inválido. Ejemplo: SAOA850312H45' };

  const datePart = upper.slice(4, 10);
  if (!rfcDateValid(datePart)) {
    return { valid: false, error: 'La fecha de nacimiento embebida en el RFC no es válida.' };
  }

  // Name consistency check (only if fullName provided)
  if (fullName && fullName.trim().length > 2) {
    const derived = deriveRfcLetters(fullName);
    if (derived && derived.confidence === 'high') {
      const rfcLetters = upper.slice(0, 4);
      if (derived.letters !== rfcLetters) {
        return {
          valid: false,
          error: `Las letras del RFC (${rfcLetters}) no coinciden con el nombre proporcionado. Basado en tu nombre, esperábamos ${derived.letters}. Verifica que ingresaste tu nombre completo en orden: Nombre Apellido-Paterno Apellido-Materno.`,
        };
      }
    }
  }

  return { valid: true };
}

/** Format RFC for display: uppercase and trimmed */
export function formatRfc(rfc: string): string {
  return rfc.toUpperCase().trim();
}

/**
 * Extract birth date from RFC (positions 5-10 = YYMMDD).
 * Returns a Date object or null if the date is invalid.
 */
export function extractBirthDate(rfc: string): Date | null {
  const upper = rfc.toUpperCase().trim();
  if (upper.length < 10) return null;
  const datePart = upper.slice(4, 10);
  const yy = parseInt(datePart.slice(0, 2), 10);
  const mm = parseInt(datePart.slice(2, 4), 10);
  const dd = parseInt(datePart.slice(4, 6), 10);
  const currentYY = new Date().getFullYear() % 100;
  const fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
  const date = new Date(fullYear, mm - 1, dd);
  if (date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  return date;
}

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Format a Date as a readable string.
 * ES: "12 de marzo de 1985"
 * EN: "March 12, 1985"
 */
export function formatBirthDate(date: Date, lang: 'es' | 'en' = 'es'): string {
  if (lang === 'es') {
    return `${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
  }
  return `${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
