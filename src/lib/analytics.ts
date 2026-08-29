/**
 * Camada fina de instrumentação.
 *
 * Os eventos são empurrados para `window.dataLayer` — formato que GTM, GA4 e a
 * maioria das ferramentas consomem direto. Enquanto nenhuma tag estiver
 * instalada, os eventos ficam acumulados no array (inofensivo) e aparecem no
 * console em desenvolvimento, então dá pra validar o funil antes de contratar
 * qualquer ferramenta.
 */

type ParamValue = string | number | boolean | null | undefined;
export type EventParams = Record<string, ParamValue>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: string, params: EventParams = {}) {
  if (typeof window === 'undefined') return;
  const payload = { event, ...params };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.debug('[analytics]', payload);
}

// ─── Eventos do funil de captação ────────────────────────────────────────────
// Nomes centralizados aqui pra não haver divergência de grafia entre telas.

export const EVENTS = {
  landingView: 'landing_view',
  landingScroll: 'landing_scroll',
  ctaClick: 'cta_click',
  whatsappClick: 'whatsapp_click',
  faqOpen: 'faq_open',
  cadastroView: 'cadastro_view',
  cadastroEtapa: 'cadastro_etapa_concluida',
  cadastroErro: 'cadastro_erro_validacao',
  cadastroEnviado: 'cadastro_enviado',
} as const;
