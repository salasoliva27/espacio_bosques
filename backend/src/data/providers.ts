/**
 * In-memory provider store for simulation mode.
 *
 * Providers are contractors/vendors who receive disbursements from the AC
 * against verified CFDI 4.0 facturas. Every peso disbursed must be backed
 * by a factura where Receptor RFC = AC's RFC.
 *
 * In production this would be a Supabase table (espacio_providers).
 */

export type ProviderType = 'fisica' | 'moral';
export type ProviderStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type EfosStatus = 'NOT_CHECKED' | 'CLEAR' | 'FLAGGED';
export type DocType = 'CFDI_XML' | 'CFDI_PDF' | 'CONTRACT' | 'PHOTO' | 'ID_DOCUMENT';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  priceRange?: string; // e.g. "$15,000 – $80,000 MXN"
}

export interface CfdiData {
  uuid: string;
  emisorRfc: string;
  receptorRfc: string;
  total: number;
  fecha: string;
  concepto: string;
}

export interface SimProviderDoc {
  id: string;
  providerId: string;
  type: DocType;
  filename: string;
  storagePath: string;  // path inside Supabase Storage bucket
  mimeType: string;
  sizeBytes: number;
  cfdiData?: CfdiData;  // populated when type = CFDI_XML
  uploadedAt: Date;
}

export interface SimProvider {
  id: string;
  userId?: string;           // Supabase user ID of the provider (owner)
  name: string;              // Nombre completo / razón social
  tipoPersona: ProviderType;
  rfc: string;               // 12 chars (moral) or 13 chars (física)
  curp?: string;             // Only for persona física
  clabe: string;             // 18-digit CLABE for SPEI disbursement
  email: string;
  phone?: string;
  specialty: string;         // e.g. "Construcción", "Electricidad", "Paisajismo"
  status: ProviderStatus;
  efosStatus: EfosStatus;    // SAT EFOS list check — NOT_CHECKED in POC
  documents: SimProviderDoc[];
  services: ServiceItem[];   // Services the provider offers
  createdAt: Date;
  updatedAt: Date;
}

// ── Seed data ────────────────────────────────────────────────────────────────

export const SIM_PROVIDERS: SimProvider[] = [
  {
    id: 'prov-001',
    name: 'Constructora Bosques S.A. de C.V.',
    tipoPersona: 'moral',
    rfc: 'CBS200101ABC',
    clabe: '014180655765704614',
    email: 'contacto@constructorabosques.mx',
    phone: '5512345678',
    specialty: 'Construcción civil',
    status: 'VERIFIED',
    efosStatus: 'CLEAR',
    documents: [],
    services: [
      { id: 'svc-001-1', name: 'Obra civil general', description: 'Construcción de infraestructura comunitaria: accesos, banquetas, muros y estructuras.', priceRange: '$80,000 – $500,000 MXN' },
      { id: 'svc-001-2', name: 'Rehabilitación de espacios', description: 'Remodelación y mejora de áreas comunes, canchas y jardines comunitarios.', priceRange: '$30,000 – $200,000 MXN' },
      { id: 'svc-001-3', name: 'Supervisión de obra', description: 'Supervisión técnica y seguimiento de avance para proyectos de terceros.', priceRange: '$15,000 – $60,000 MXN' },
    ],
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
  },
  {
    id: 'prov-002',
    name: 'Carlos Mendoza García',
    tipoPersona: 'fisica',
    rfc: 'MEGC850301XY2',
    curp: 'MEGC850301HDFNRR09',
    clabe: '002180700977243108',
    email: 'carlos@mendozalandscape.mx',
    phone: '5598765432',
    specialty: 'Paisajismo y jardinería',
    status: 'PENDING',
    efosStatus: 'NOT_CHECKED',
    documents: [],
    services: [
      { id: 'svc-002-1', name: 'Diseño de jardines', description: 'Diseño y plantación de jardines comunitarios con especies nativas de la región.', priceRange: '$20,000 – $80,000 MXN' },
      { id: 'svc-002-2', name: 'Mantenimiento de áreas verdes', description: 'Servicio mensual de poda, riego y cuidado de áreas verdes.', priceRange: '$5,000 – $18,000 MXN / mes' },
    ],
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-15'),
  },
];

// ── CRUD helpers ─────────────────────────────────────────────────────────────

export function getProvider(id: string): SimProvider | undefined {
  return SIM_PROVIDERS.find(p => p.id === id);
}

export function addProvider(
  data: Omit<SimProvider, 'id' | 'status' | 'efosStatus' | 'documents' | 'services' | 'createdAt' | 'updatedAt'>
): SimProvider {
  const provider: SimProvider = {
    ...data,
    id: `prov-${Date.now()}`,
    status: 'PENDING',
    efosStatus: 'NOT_CHECKED',
    documents: [],
    services: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  SIM_PROVIDERS.push(provider);
  return provider;
}

export function updateProviderStatus(id: string, status: ProviderStatus): SimProvider | null {
  const p = getProvider(id);
  if (!p) return null;
  p.status = status;
  p.updatedAt = new Date();
  return p;
}

export function addProviderDocument(
  providerId: string,
  doc: Omit<SimProviderDoc, 'id' | 'providerId' | 'uploadedAt'>
): SimProviderDoc | null {
  const p = getProvider(providerId);
  if (!p) return null;
  const document: SimProviderDoc = {
    ...doc,
    id: `doc-${Date.now()}`,
    providerId,
    uploadedAt: new Date(),
  };
  p.documents.push(document);
  p.updatedAt = new Date();
  return document;
}

// ── CLABE validator ──────────────────────────────────────────────────────────
// Algorithm: https://en.wikipedia.org/wiki/CLABE

const CLABE_WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];

export function validateClabe(clabe: string): { valid: boolean; error?: string } {
  if (!/^\d{18}$/.test(clabe)) return { valid: false, error: 'CLABE must be exactly 18 digits' };
  const digits = clabe.split('').map(Number);
  const sum = CLABE_WEIGHTS.reduce((acc, w, i) => acc + (digits[i] * w) % 10, 0);
  const control = (10 - (sum % 10)) % 10;
  if (control !== digits[17]) return { valid: false, error: 'CLABE check digit invalid' };
  return { valid: true };
}

// ── RFC format validator ─────────────────────────────────────────────────────

export function validateRfc(rfc: string, tipo: ProviderType): { valid: boolean; error?: string } {
  const rfc_upper = rfc.toUpperCase();
  // Persona moral: 3 letters + 6 digits + 3 alphanumeric = 12 chars
  // Persona física: 4 letters + 6 digits + 3 alphanumeric = 13 chars
  const pattern = tipo === 'moral'
    ? /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/
    : /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  if (!pattern.test(rfc_upper)) {
    return { valid: false, error: `RFC format invalid for persona ${tipo}` };
  }
  return { valid: true };
}

// ── CFDI 4.0 XML parser ──────────────────────────────────────────────────────
// Extracts key attributes from a CFDI 4.0 XML string using regex.
// In production use a proper XML parser for robustness.

export function parseCfdiXml(xml: string): CfdiData | null {
  try {
    const uuid = xml.match(/UUID="([^"]+)"/i)?.[1] ?? '';
    const emisorRfc = xml.match(/Emisor[^>]*\sRfc="([^"]+)"/i)?.[1] ?? '';
    const receptorRfc = xml.match(/Receptor[^>]*\sRfc="([^"]+)"/i)?.[1] ?? '';
    const total = parseFloat(xml.match(/\sTotal="([^"]+)"/i)?.[1] ?? '0');
    const fecha = xml.match(/\sFecha="([^"]+)"/i)?.[1] ?? '';
    const concepto = xml.match(/Descripcion="([^"]+)"/i)?.[1] ?? '';

    if (!uuid || !emisorRfc || !receptorRfc) return null;

    return {
      uuid: uuid.toUpperCase(),
      emisorRfc: emisorRfc.toUpperCase(),
      receptorRfc: receptorRfc.toUpperCase(),
      total,
      fecha,
      concepto,
    };
  } catch {
    return null;
  }
}
