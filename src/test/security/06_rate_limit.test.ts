/**
 * SECURITY TESTS — Rate limit do cadastro público de revendedoras
 *
 * A edge function `reseller-registration` é o único endpoint gravável por
 * visitante anônimo. O freio real vive no Postgres
 * (`public.rate_limit_consumir`, migration 20260809230000); aqui espelhamos a
 * mesma lógica de janela fixa para travar o comportamento esperado:
 *
 *  - contagem por chave (IP + escopo), sem vazamento entre IPs ou ações
 *  - a requisição de número `limite` ainda passa; a seguinte é barrada
 *  - a janela seguinte zera o contador
 *  - o escopo `start` é mais apertado que o `geral`
 */

import { describe, it, expect } from 'vitest';

// ─── Espelho da lógica de janela fixa do banco ────────────────────────────────

function janelaInicio(agoraSegundos: number, janelaSegundos: number): number {
  return Math.floor(agoraSegundos / janelaSegundos) * janelaSegundos;
}

type Balde = Map<string, number>;

/** Espelha `public.rate_limit_consumir`: TRUE = dentro do limite. */
function consumir(
  balde: Balde,
  chave: string,
  agoraSegundos: number,
  janelaSegundos: number,
  limite: number,
): boolean {
  const bucket = `${chave}@${janelaInicio(agoraSegundos, janelaSegundos)}`;
  const total = (balde.get(bucket) ?? 0) + 1;
  balde.set(bucket, total);
  return total <= limite;
}

// Mesmos valores de `LIMITES` na edge function.
const LIMITES: Record<string, Array<{ janela: number; limite: number }>> = {
  geral: [
    { janela: 60, limite: 20 },
    { janela: 3600, limite: 120 },
  ],
  start: [
    { janela: 300, limite: 5 },
    { janela: 3600, limite: 15 },
  ],
  complete: [
    { janela: 300, limite: 5 },
    { janela: 3600, limite: 15 },
  ],
};

/** Espelha `excedeuLimite`: devolve a janela estourada, ou null se liberado. */
function excedeuLimite(balde: Balde, ip: string, escopo: string, agora: number): number | null {
  for (const { janela, limite } of LIMITES[escopo] ?? []) {
    if (!consumir(balde, `reseller:${escopo}:${ip}`, agora, janela, limite)) return janela;
  }
  return null;
}

// ─── janelaInicio ─────────────────────────────────────────────────────────────

describe('janelaInicio', () => {
  it('POSITIVO: dois instantes dentro da mesma janela caem no mesmo balde', () => {
    expect(janelaInicio(1_000_200, 300)).toBe(janelaInicio(1_000_499, 300));
  });

  it('POSITIVO: o início da janela é múltiplo do tamanho da janela', () => {
    expect(janelaInicio(1_000_123, 60) % 60).toBe(0);
  });

  it('NEGATIVO: instantes em janelas vizinhas não compartilham balde', () => {
    expect(janelaInicio(1_000_499, 300)).not.toBe(janelaInicio(1_000_500, 300));
  });

  it('NEGATIVO: janela pequena não agrupa o que a janela grande agruparia', () => {
    expect(janelaInicio(1_000_000, 60)).not.toBe(janelaInicio(1_000_000, 3600));
  });
});

// ─── consumir ─────────────────────────────────────────────────────────────────

describe('consumir (rate_limit_consumir)', () => {
  it('POSITIVO: libera enquanto o total está dentro do limite', () => {
    const balde: Balde = new Map();
    const resultados = [1, 2, 3, 4, 5].map(() => consumir(balde, 'ip-a', 1000, 300, 5));
    expect(resultados).toEqual([true, true, true, true, true]);
  });

  it('POSITIVO: a janela seguinte zera o contador de quem tinha estourado', () => {
    const balde: Balde = new Map();
    for (let i = 0; i < 6; i++) consumir(balde, 'ip-a', 1000, 300, 5);
    expect(consumir(balde, 'ip-a', 1000 + 300, 300, 5)).toBe(true);
  });

  it('NEGATIVO: barra a requisição imediatamente após atingir o limite', () => {
    const balde: Balde = new Map();
    for (let i = 0; i < 5; i++) consumir(balde, 'ip-a', 1000, 300, 5);
    expect(consumir(balde, 'ip-a', 1000, 300, 5)).toBe(false);
    expect(consumir(balde, 'ip-a', 1000, 300, 5)).toBe(false);
  });

  it('NEGATIVO: um IP estourado não bloqueia outro IP (sem contador global)', () => {
    const balde: Balde = new Map();
    for (let i = 0; i < 10; i++) consumir(balde, 'ip-atacante', 1000, 300, 5);
    expect(consumir(balde, 'ip-legitimo', 1000, 300, 5)).toBe(true);
  });
});

// ─── excedeuLimite ────────────────────────────────────────────────────────────

describe('excedeuLimite', () => {
  it('POSITIVO: cadastro humano normal (1 start + 1 complete) passa liberado', () => {
    const balde: Balde = new Map();
    expect(excedeuLimite(balde, 'ip-humano', 'geral', 1000)).toBeNull();
    expect(excedeuLimite(balde, 'ip-humano', 'start', 1000)).toBeNull();
    expect(excedeuLimite(balde, 'ip-humano', 'geral', 1200)).toBeNull();
    expect(excedeuLimite(balde, 'ip-humano', 'complete', 1200)).toBeNull();
  });

  it('POSITIVO: cota de `start` esgotada não impede terminar um rascunho já aberto', () => {
    const balde: Balde = new Map();
    for (let i = 0; i < 6; i++) excedeuLimite(balde, 'ip-a', 'start', 1000);
    expect(excedeuLimite(balde, 'ip-a', 'complete', 1000)).toBeNull();
  });

  it('NEGATIVO: rajada de 6 `start` na mesma janela de 5 min é barrada', () => {
    const balde: Balde = new Map();
    for (let i = 0; i < 5; i++) expect(excedeuLimite(balde, 'ip-bot', 'start', 1000)).toBeNull();
    expect(excedeuLimite(balde, 'ip-bot', 'start', 1000)).toBe(300);
  });

  it('NEGATIVO: inundação lenta ainda cai na janela de 1 hora', () => {
    const balde: Balde = new Map();
    let barrado: number | null = null;
    // Tentativas espaçadas de 200s: nunca passam de 2 por janela de 5 min
    // (limite 5), mas somam 16 dentro da mesma hora (limite 15).
    for (let i = 0; i < 16 && barrado === null; i++) {
      barrado = excedeuLimite(balde, 'ip-bot-lento', 'start', 3_600_000 + i * 200);
    }
    expect(barrado).toBe(3600);
  });
});
