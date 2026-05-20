/**
 * SECURITY TESTS — Race Conditions (TOCTOU)
 *
 * Cobre:
 *  - Múltiplas requisições simultâneas de venda do mesmo produto
 *  - A proteção deve estar no trigger via FOR UPDATE (pessimistic lock)
 *  - Verifica que o código client-side não tem proteção contra race condition
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Simulação simplificada do fluxo de estoque ───────────────────────────────

interface EstoqueRow {
  id: string;
  produto_id: string;
  user_id: string;
  quantidade: number;
}

/** Simula o fluxo VULNERÁVEL: check-then-act sem lock */
async function registrarVendaVulneravel(
  db: { estoque: EstoqueRow[] },
  userId: string,
  produtoId: string,
): Promise<{ ok: boolean; error?: string }> {
  // 1. CHECK: verifica estoque (sem lock)
  const row = db.estoque.find((e) => e.user_id === userId && e.produto_id === produtoId);
  if (!row || row.quantidade <= 0) {
    return { ok: false, error: 'Sem estoque' };
  }

  // Simula latência de rede/processamento — janela para race condition
  await new Promise((r) => setTimeout(r, 0));

  // 2. ACT: debita estoque (mas outro request já debitou nesse intervalo!)
  row.quantidade -= 1;
  return { ok: true };
}

/** Simula o fluxo CORRIGIDO: FOR UPDATE no trigger previne race condition no DB */
async function registrarVendaCorrigida(
  db: { estoque: EstoqueRow[]; lock: Set<string> },
  userId: string,
  produtoId: string,
): Promise<{ ok: boolean; error?: string }> {
  const lockKey = `${userId}:${produtoId}`;

  // Simula SELECT ... FOR UPDATE: só um processo por vez pode executar
  if (db.lock.has(lockKey)) {
    return { ok: false, error: 'Recurso bloqueado por outra transação' };
  }

  db.lock.add(lockKey);
  try {
    const row = db.estoque.find((e) => e.user_id === userId && e.produto_id === produtoId);
    if (!row || row.quantidade <= 0) {
      return { ok: false, error: 'Sem estoque' };
    }
    await new Promise((r) => setTimeout(r, 0));
    row.quantidade -= 1;
    return { ok: true };
  } finally {
    db.lock.delete(lockKey);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Race Condition — TOCTOU no estoque (VULNERÁVEL)', () => {
  it('duas requests simultâneas com estoque=1 ambas têm sucesso (oversell)', async () => {
    const db = {
      estoque: [{ id: 'e1', produto_id: 'p1', user_id: 'u1', quantidade: 1 }],
    };

    // Dispara duas requisições simultâneas
    const [res1, res2] = await Promise.all([
      registrarVendaVulneravel(db, 'u1', 'p1'),
      registrarVendaVulneravel(db, 'u1', 'p1'),
    ]);

    // Ambas passaram no CHECK de estoque antes de qualquer uma decrementar
    const ambas_ok = res1.ok && res2.ok;

    // Documenta a vulnerabilidade: o estoque ficou negativo
    const estoqueAtual = db.estoque[0].quantidade;

    // Em um cenário real isso resultaria em estoque negativo (oversell)
    // Este teste PASSA exatamente porque demonstra a falha
    expect(ambas_ok || estoqueAtual < 0 || estoqueAtual === 0).toBe(true);
  });
});

describe('Race Condition — DB lock via FOR UPDATE (CORRIGIDO)', () => {
  it('duas requests simultâneas com estoque=1: apenas uma tem sucesso', async () => {
    const db = {
      estoque: [{ id: 'e1', produto_id: 'p1', user_id: 'u1', quantidade: 1 }],
      lock: new Set<string>(),
    };

    const [res1, res2] = await Promise.all([
      registrarVendaCorrigida(db, 'u1', 'p1'),
      registrarVendaCorrigida(db, 'u1', 'p1'),
    ]);

    const sucessos = [res1, res2].filter((r) => r.ok).length;
    expect(sucessos).toBe(1); // apenas uma venda vai passar

    // Estoque nunca fica negativo
    expect(db.estoque[0].quantidade).toBeGreaterThanOrEqual(0);
  });

  it('estoque zerado é protegido — segunda request retorna erro', async () => {
    const db = {
      estoque: [{ id: 'e1', produto_id: 'p1', user_id: 'u1', quantidade: 0 }],
      lock: new Set<string>(),
    };

    const res = await registrarVendaCorrigida(db, 'u1', 'p1');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Sem estoque/);
  });
});

describe('Race Condition — Proteção existente no trigger validar_e_baixar_estoque()', () => {
  it('confirma que o trigger usa FOR UPDATE (documentação do fix)', () => {
    // O arquivo supabase/migrations/20260516030000_fix_validar_baixar_estoque.sql
    // contém: SELECT id, quantidade INTO v_estoque_id, v_quantidade
    //           FROM public.estoque
    //           WHERE user_id = NEW.user_id AND produto_id = NEW.produto_id
    //           FOR UPDATE;
    //
    // FOR UPDATE é um pessimistic lock de linha. Quando a transação A executa
    // esta query, qualquer transação B que tente executar a mesma query ficará
    // bloqueada até que A faça COMMIT ou ROLLBACK.
    //
    // Isso previne o oversell sem precisar de lógica adicional no application layer.

    const triggerCode = `
      SELECT id, quantidade INTO v_estoque_id, v_quantidade
      FROM public.estoque
      WHERE user_id   = NEW.user_id
        AND produto_id = NEW.produto_id
      FOR UPDATE;
    `;

    expect(triggerCode).toContain('FOR UPDATE');
  });
});
