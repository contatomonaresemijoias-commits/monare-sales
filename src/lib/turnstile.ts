/**
 * Cloudflare Turnstile — verificação de humano na etapa 1 do cadastro público.
 *
 * A etapa 1 (`action: 'start'`) é a única ação do sistema que um visitante
 * anônimo usa para criar linha nova em `candidatas_revenda`. O rate limit por
 * IP na edge function segura rajada de uma origem só; o Turnstile é o que
 * segura bot distribuído.
 *
 * A chave pública vem do build (`VITE_TURNSTILE_SITE_KEY`). Sem ela o widget
 * não é montado e o formulário segue funcionando como antes — é isso que
 * mantém o desenvolvimento local e os testes rodando sem conta na Cloudflare.
 * A cobrança do outro lado é simétrica: a edge function só exige o token
 * quando o secret `TURNSTILE_SECRET_KEY` existe.
 */

export const TURNSTILE_SITE_KEY: string = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

/** `render=explicit` porque montamos o widget no momento em que a etapa 1 aparece. */
export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** O widget só entra em cena quando há site key de verdade configurada. */
export function turnstileAtivo(siteKey: string = TURNSTILE_SITE_KEY): boolean {
  return typeof siteKey === 'string' && siteKey.trim().length > 0;
}

/**
 * A etapa 1 só libera o "Continuar" quando há token em mãos. Deixar passar sem
 * token seria pior que não ter captcha: a candidata avançaria na tela e tomaria
 * a recusa do servidor sem entender o motivo.
 */
export function podeAvancarEtapa1(token: string | null, siteKey: string = TURNSTILE_SITE_KEY): boolean {
  if (!turnstileAtivo(siteKey)) return true;
  return typeof token === 'string' && token.length > 0;
}
