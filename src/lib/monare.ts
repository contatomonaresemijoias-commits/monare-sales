// ─────────────────────────────────────────────────────────────────────────────
// src/lib/monare.ts
// Funções auxiliares da Monarê Semijoias
// ─────────────────────────────────────────────────────────────────────────────

// Texto exato do termo de garantia — fonte única da verdade.
// Referenciado pelo SaleRegistrationForm e qualquer outro componente
// que precise exibir este termo.
export const WARRANTY_TEXT =
  "concordo que estou entregando as peças em plenas condições com garantia de 12 meses.";

export const WARRANTY_MONTHS = 12;

/**
 * Retorna o texto do checkbox de garantia.
 * Usar esta função garante consistência em todos os formulários.
 */
export function getWarrantyCheckboxText(): string {
  return WARRANTY_TEXT;
}

/**
 * Alias mantido por compatibilidade com código anterior.
 * @deprecated Use `getWarrantyCheckboxText()` diretamente.
 */
export function formatWarrantyText(): string {
  return getWarrantyCheckboxText();
}

/**
 * Calcula a data de expiração da garantia a partir da data de venda.
 * @param dataVenda - ISO string da data da venda
 * @returns ISO string da data de expiração
 */
export function calcularExpiracaoGarantia(dataVenda: string): string {
  const data = new Date(dataVenda);
  data.setMonth(data.getMonth() + WARRANTY_MONTHS);
  return data.toISOString();
}

/**
 * Formata valor monetário no padrão brasileiro.
 * Ex: 129.9 → "R$ 129,90"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Normaliza SKU para busca: uppercase e remove espaços.
 * Ex: "mn-an 001" → "MN-AN-001" (se o padrão usar hífen)
 */
export function normalizeSKU(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Formata data ISO para exibição no padrão brasileiro.
 * Ex: "2026-05-01T10:00:00Z" → "01/05/2026"
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("pt-BR");
}
