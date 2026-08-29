// ─────────────────────────────────────────────────────────────────────────────
// src/lib/monare.ts
// Funções auxiliares da Monarê Semijoias
// ─────────────────────────────────────────────────────────────────────────────

export const INSTAGRAM_URL = 'https://www.instagram.com/monare.oficial/';
export const WARRANTY_MONTHS = 12;

/** WhatsApp oficial de atendimento (formato internacional, só dígitos). */
export const WHATSAPP_MONARE = '5515996338541';

/** Monta o link de conversa já com a mensagem preenchida. */
export function whatsappLink(mensagem: string, numero = WHATSAPP_MONARE) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export const WARRANTY_TEXT =
  "concordo que estou entregando as peças em plenas condições com garantia de 12 meses.";

export function getWarrantyCheckboxText(): string {
  return WARRANTY_TEXT;
}

/** @deprecated Use `getWarrantyCheckboxText()` */
export function formatWarrantyText(): string {
  return getWarrantyCheckboxText();
}

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

// ── Comissão ─────────────────────────────────────────────────────────────────

/**
 * Vendas acumuladas no ciclo para a comissão poder ser sacada.
 *
 * Não confundir com o cálculo da comissão: ela é apurada desde a primeira
 * venda (30% / 35% / 38%, iguais para todos os papéis). O que este mínimo
 * define é quando o valor apurado fica liberado para receber.
 */
export const MINIMO_VENDAS_SAQUE = 600;

export type StatusComissao = {
  /** Já pode receber? */
  liberada: boolean;
  /** Quanto ainda falta vender no ciclo. Zero quando liberada. */
  faltam: number;
};

export function statusComissao(totalVendas: number | null | undefined): StatusComissao {
  const total = totalVendas ?? 0;
  // Arredonda para centavos: sem isso, R$ 599,999… de soma em ponto flutuante
  // apareceria como "faltam R$ 0,00" e ainda assim bloqueado.
  const faltam = Math.max(0, Math.round((MINIMO_VENDAS_SAQUE - total) * 100) / 100);
  return { liberada: faltam === 0, faltam };
}

/** Fuso da operação — todas as datas de venda são do ponto de vista do Brasil. */
export const TIMEZONE_BR = 'America/Sao_Paulo';

/**
 * Soma (ou subtrai) dias a uma data YYYY-MM-DD sem passar por fuso horário.
 * A aritmética é feita em UTC justamente para não escorregar de dia.
 */
export function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split('T')[0];
}

/**
 * Hoje em YYYY-MM-DD no horário de Brasília.
 * Não usa toISOString() (que devolve a data em UTC e vira o dia às 21h daqui)
 * nem o fuso do dispositivo — o formatter fixa America/Sao_Paulo.
 * O locale en-CA é só o atalho para o formato YYYY-MM-DD.
 */
export function getToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_BR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Data mais antiga que a revendedora pode lançar: 3 dias atrás no horário de Brasília. */
export function getMinDate() {
  return addDaysISO(getToday(), -3);
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

/** Alias for calcularExpiracaoGarantia */
export function calcularExpiracaoGarantia(dataVenda: string): string {
  const data = new Date(dataVenda);
  data.setMonth(data.getMonth() + WARRANTY_MONTHS);
  return data.toISOString();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function normalizeSKU(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "");
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("pt-BR");
}
