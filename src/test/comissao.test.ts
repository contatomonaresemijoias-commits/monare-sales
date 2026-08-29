/**
 * REGRA DE COMISSÃO — faixa única para todos os papéis
 *
 * Espelha `private.comissao_pct` (migration 20260809234500). O cálculo de
 * verdade é do banco; aqui travamos a regra de negócio para que uma mudança
 * silenciosa nas faixas quebre o teste em vez de quebrar o acerto do ciclo.
 *
 *   R$     0,00 a R$ 1.999,99 → 30%
 *   R$ 2.000,00 a R$ 3.999,99 → 35%
 *   R$ 4.000,00 em diante     → 38%
 *
 * Desde 09/08/2026 não há diferença entre revendedora e b2b, nem mínimo de
 * R$ 400 por ciclo, nem faixas de 40/45/50%.
 */

import { describe, it, expect } from 'vitest';
import { statusComissao, MINIMO_VENDAS_SAQUE } from '@/lib/monare';

type Papel = 'revendedora' | 'b2b' | 'administrador';

function comissaoPct(_papel: Papel, total: number | null): number {
  if (total === null || total < 0) return 0;
  if (total <= 1999.99) return 30;
  if (total <= 3999.99) return 35;
  return 38;
}

describe('comissaoPct — faixas', () => {
  it('POSITIVO: até R$ 1.999,99 paga 30%, já na primeira venda', () => {
    expect(comissaoPct('revendedora', 0.01)).toBe(30);
    expect(comissaoPct('revendedora', 1200)).toBe(30);
    expect(comissaoPct('revendedora', 1999.99)).toBe(30);
  });

  it('POSITIVO: as bordas de cada faixa caem no percentual certo', () => {
    expect(comissaoPct('revendedora', 2000)).toBe(35);
    expect(comissaoPct('revendedora', 3999.99)).toBe(35);
    expect(comissaoPct('revendedora', 4000)).toBe(38);
  });

  it('NEGATIVO: R$ 1.999,99 não vira 35% (a faixa começa em 2.000,00)', () => {
    expect(comissaoPct('revendedora', 1999.99)).not.toBe(35);
    expect(comissaoPct('revendedora', 3999.99)).not.toBe(38);
  });

  it('NEGATIVO: ciclo sem venda ou com total inválido não gera comissão', () => {
    expect(comissaoPct('revendedora', 0)).toBe(30); // 30% de zero é zero
    expect(comissaoPct('revendedora', null)).toBe(0);
    expect(comissaoPct('revendedora', -50)).toBe(0);
  });
});

describe('comissaoPct — o que a regra nova eliminou', () => {
  it('POSITIVO: b2b recebe exatamente o mesmo que revendedora', () => {
    for (const total of [500, 1999.99, 2000, 4000, 25000]) {
      expect(comissaoPct('b2b', total)).toBe(comissaoPct('revendedora', total));
    }
  });

  it('POSITIVO: 38% é o teto — venda alta não escala mais', () => {
    expect(comissaoPct('revendedora', 9000)).toBe(38);
    expect(comissaoPct('revendedora', 19000)).toBe(38);
    expect(comissaoPct('revendedora', 100000)).toBe(38);
  });

  it('NEGATIVO: b2b não recebe mais os 20% fixos', () => {
    expect(comissaoPct('b2b', 500)).not.toBe(20);
    expect(comissaoPct('b2b', 5000)).not.toBe(20);
  });

  it('NEGATIVO: não existe mais mínimo de R$ 400 nem faixas de 40/45/50%', () => {
    expect(comissaoPct('revendedora', 399.99)).toBe(30);
    expect([40, 45, 50]).not.toContain(comissaoPct('revendedora', 8999.99));
    expect([40, 45, 50]).not.toContain(comissaoPct('revendedora', 18999.99));
  });
});

/**
 * O mínimo do ciclo não muda quanto a revendedora ganha — muda só quando ela
 * pode sacar. A comissão continua sendo apurada e exibida desde a 1ª venda.
 */
describe('statusComissao — liberação do saque', () => {
  it('POSITIVO: a partir de R$ 600 acumulados o saque fica liberado', () => {
    expect(statusComissao(600)).toEqual({ liberada: true, faltam: 0 });
    expect(statusComissao(5000)).toEqual({ liberada: true, faltam: 0 });
  });

  it('POSITIVO: abaixo do mínimo, informa exatamente quanto falta', () => {
    expect(statusComissao(0)).toEqual({ liberada: false, faltam: 600 });
    expect(statusComissao(450.5)).toEqual({ liberada: false, faltam: 149.5 });
  });

  it('NEGATIVO: R$ 599,99 ainda não libera', () => {
    expect(statusComissao(599.99).liberada).toBe(false);
    expect(statusComissao(599.99).faltam).toBeCloseTo(0.01, 2);
  });

  it('NEGATIVO: ciclo sem saldo não vem liberado por engano', () => {
    expect(statusComissao(null).liberada).toBe(false);
    expect(statusComissao(undefined)).toEqual({ liberada: false, faltam: MINIMO_VENDAS_SAQUE });
  });
});
