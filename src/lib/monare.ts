export const INSTAGRAM_URL = 'https://www.instagram.com/monare.oficial/';

export function getCertificateBaseUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/garantia`;
  }
  return '/garantia';
}

export function generateWarrantyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MNR-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().split('T')[0];
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function formatDateBR(iso?: string | null) {
  if (!iso) return '—';
  const date = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function getWarrantyExpiryISO(iso: string) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export function getWarrantyExpiryBR(iso?: string | null) {
  if (!iso) return '—';
  return formatDateBR(getWarrantyExpiryISO(iso.includes('T') ? iso.split('T')[0] : iso));
}
