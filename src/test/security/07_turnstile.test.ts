/**
 * SECURITY TESTS — Turnstile na etapa 1 do cadastro público
 *
 * A verificação de humano protege `action: 'start'`, a única ação que um
 * visitante anônimo usa para criar linha nova em `candidatas_revenda`.
 *
 * Duas metades, testadas aqui:
 *  - o portão da tela (`podeAvancarEtapa1`, importado de verdade), que impede a
 *    candidata de avançar sem token e tomar recusa do servidor sem entender;
 *  - o veredicto do servidor, espelhado da `verificarCaptcha` da edge function
 *    (Deno, fora do alcance do Vitest) — mesma tabela de decisão, incluindo o
 *    fail-open quando a Cloudflare não responde.
 */

import { describe, it, expect } from 'vitest';
import { podeAvancarEtapa1, turnstileAtivo } from '@/lib/turnstile';

// ─── Espelho de `verificarCaptcha` na edge function ───────────────────────────

type VeredictoCaptcha = 'ok' | 'ausente' | 'invalido' | 'indisponivel';

type RespostaSiteverify = { ok: boolean; success?: boolean } | 'rede_caiu';

function verificarCaptcha(
  secret: string,
  token: unknown,
  siteverify: (t: string) => RespostaSiteverify,
): VeredictoCaptcha {
  if (!secret) return 'ok';

  const resposta = typeof token === 'string' ? token.trim() : '';
  if (!resposta || resposta.length > 2048) return 'ausente';

  const res = siteverify(resposta);
  if (res === 'rede_caiu') return 'indisponivel';
  if (!res.ok) return 'indisponivel';
  return res.success === true ? 'ok' : 'invalido';
}

/** Espelha a decisão do handler: só 'ausente' e 'invalido' barram o `start`. */
function startBarrado(veredicto: VeredictoCaptcha): boolean {
  return veredicto === 'ausente' || veredicto === 'invalido';
}

const SECRET = 'segredo-de-teste';
const aprova = () => ({ ok: true, success: true });
const reprova = () => ({ ok: true, success: false });
const foraDoAr = () => 'rede_caiu' as const;

// ─── Portão da tela ──────────────────────────────────────────────────────────

describe('podeAvancarEtapa1', () => {
  it('libera quando há site key e token emitido', () => {
    expect(podeAvancarEtapa1('token-valido', 'site-key')).toBe(true);
  });

  it('libera sem site key configurada — dev e teste seguem funcionando', () => {
    expect(podeAvancarEtapa1(null, '')).toBe(true);
    expect(podeAvancarEtapa1(null, '   ')).toBe(true);
  });

  it('barra quando o widget está ativo e ainda não devolveu token', () => {
    expect(podeAvancarEtapa1(null, 'site-key')).toBe(false);
  });

  it('barra token vazio, que é o estado após expirar ou dar erro', () => {
    expect(podeAvancarEtapa1('', 'site-key')).toBe(false);
  });
});

describe('turnstileAtivo', () => {
  it('reconhece site key preenchida', () => {
    expect(turnstileAtivo('0x4AAA')).toBe(true);
  });

  it('trata string vazia e só-espaços como desligado', () => {
    expect(turnstileAtivo('')).toBe(false);
    expect(turnstileAtivo('  ')).toBe(false);
  });
});

// ─── Veredicto do servidor ───────────────────────────────────────────────────

describe('verificarCaptcha (espelho da edge function)', () => {
  it('aprova token que a Cloudflare confirma', () => {
    expect(verificarCaptcha(SECRET, 'token-bom', aprova)).toBe('ok');
    expect(startBarrado('ok')).toBe(false);
  });

  it('não exige token enquanto o secret não está configurado', () => {
    expect(verificarCaptcha('', null, reprova)).toBe('ok');
    expect(verificarCaptcha('', undefined, reprova)).toBe('ok');
  });

  it('barra requisição sem token quando a exigência está ligada', () => {
    for (const token of [undefined, null, '', '   ', 42, {}]) {
      expect(verificarCaptcha(SECRET, token, aprova)).toBe('ausente');
      expect(startBarrado('ausente')).toBe(true);
    }
  });

  it('barra token que a Cloudflare recusa', () => {
    expect(verificarCaptcha(SECRET, 'token-forjado', reprova)).toBe('invalido');
    expect(startBarrado('invalido')).toBe(true);
  });

  it('barra token acima do teto de tamanho, sem chamar o siteverify', () => {
    let chamadas = 0;
    const contando = () => {
      chamadas++;
      return aprova();
    };
    expect(verificarCaptcha(SECRET, 'x'.repeat(2049), contando)).toBe('ausente');
    expect(chamadas).toBe(0);
  });

  it('libera com fail-open quando a Cloudflare não responde', () => {
    expect(verificarCaptcha(SECRET, 'token-bom', foraDoAr)).toBe('indisponivel');
    expect(verificarCaptcha(SECRET, 'token-bom', () => ({ ok: false }))).toBe('indisponivel');
    // Indisponibilidade da Cloudflare não pode derrubar a captação.
    expect(startBarrado('indisponivel')).toBe(false);
  });
});
