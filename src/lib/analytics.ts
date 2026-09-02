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
    dataLayer?: unknown[];
    gtag?: (command: 'event' | 'config' | 'js', target: string | Date, params?: Record<string, unknown>) => void;
  }
}

export function track(event: string, params: EventParams = {}) {
  if (typeof window === 'undefined') return;
  const cleanParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null));
  const payload = { event, ...cleanParams };
  window.dataLayer = window.dataLayer ?? [];
  if (window.gtag) window.gtag('event', event, cleanParams);
  else window.dataLayer.push(['event', event, cleanParams]);
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.debug('[analytics]', payload);
}

const ATTRIBUTION_KEY = 'monare_ga4_attribution';
const CAPTACAO_VALUES = ['beleza', 'educação', 'renda extra'] as const;

type CaptacaoValue = (typeof CAPTACAO_VALUES)[number];
type Attribution = {
  motivo_captacao?: CaptacaoValue;
  origem_anuncio?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function normalizeCaptacao(value: string | null): CaptacaoValue | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/_/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('beleza')) return 'beleza';
  if (normalized.includes('educa')) return 'educação';
  if (normalized.includes('renda')) return 'renda extra';
  return undefined;
}

export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  let saved: Attribution = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}') as Attribution;
  } catch {
    saved = {};
  }

  const query = new URLSearchParams(window.location.search);
  const utm_campaign = query.get('utm_campaign') || saved.utm_campaign;
  const utm_content = query.get('utm_content') || saved.utm_content;
  const next: Attribution = {
    motivo_captacao:
      normalizeCaptacao(query.get('motivo_captacao')) ||
      saved.motivo_captacao ||
      normalizeCaptacao(utm_campaign) ||
      normalizeCaptacao(utm_content),
    origem_anuncio: [utm_campaign, utm_content].filter(Boolean).join(' / ') || saved.origem_anuncio,
    utm_source: query.get('utm_source') || saved.utm_source,
    utm_medium: query.get('utm_medium') || saved.utm_medium,
    utm_campaign,
    utm_content,
  };
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Navegação privada ou armazenamento bloqueado não pode impedir o cadastro.
  }
  return next;
}

export function getAttribution(): Attribution {
  return captureAttribution();
}

// ─── Eventos do funil de captação ────────────────────────────────────────────
// Nomes centralizados aqui pra não haver divergência de grafia entre telas.

export const EVENTS = {
  landingView: 'visualizacao_lp',
  landingScroll: 'landing_scroll',
  ctaClick: 'clique_quero_ser_revendedora',
  whatsappClick: 'whatsapp_click',
  faqOpen: 'faq_open',
  cadastroView: 'cadastro_iniciado',
  cadastroErro: 'cadastro_erro_validacao',
  cadastroEnviado: 'cadastro_concluido',
} as const;
