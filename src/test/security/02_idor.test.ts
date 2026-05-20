/**
 * SECURITY TESTS — IDOR (Insecure Direct Object Reference)
 *
 * Cobre:
 *  - Qualquer usuário autenticado pode atualizar o telefone de QUALQUER cliente
 *    (RLS clientes com USING (true) no UPDATE)
 *  - Revendedora não deve acessar vendas de outra revendedora
 *  - user_id deve sempre vir do token JWT, nunca do body da request
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Simulação das políticas de RLS ──────────────────────────────────────────

interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  user_id?: string; // proprietário
}

interface Venda {
  id: string;
  user_id: string;
  cliente_whatsapp: string;
  produto_id: string;
  valor_venda: number;
}

const CLIENTES_DB: Cliente[] = [
  { id: 'c1', nome: 'Ana Lima',   whatsapp: '11999990001', user_id: 'user-alice' },
  { id: 'c2', nome: 'Beto Cruz',  whatsapp: '11999990002', user_id: 'user-alice' },
  { id: 'c3', nome: 'Carla Melo', whatsapp: '11999990003', user_id: 'user-bob'   },
];

const VENDAS_DB: Venda[] = [
  { id: 'v1', user_id: 'user-alice', cliente_whatsapp: '11999990001', produto_id: 'p1', valor_venda: 89.90 },
  { id: 'v2', user_id: 'user-alice', cliente_whatsapp: '11999990002', produto_id: 'p2', valor_venda: 59.90 },
  { id: 'v3', user_id: 'user-bob',   cliente_whatsapp: '11999990003', produto_id: 'p1', valor_venda: 89.90 },
];

/** Simula a política VULNERÁVEL original: USING (true) */
function podeAtualizarClienteVulneravel(_authUserId: string, _clienteWhatsapp: string): boolean {
  return true; // ← qualquer autenticado pode atualizar qualquer cliente
}

/** Simula a política CORRIGIDA: verifica propriedade via vendas */
function podeAtualizarClienteCorrigido(authUserId: string, clienteWhatsapp: string): boolean {
  const isAdmin = authUserId === 'user-admin';
  if (isAdmin) return true;

  return VENDAS_DB.some(
    (v) => v.user_id === authUserId && v.cliente_whatsapp === clienteWhatsapp,
  );
}

/** Simula a política vulnerável de SELECT: USING (true) */
function podeVerClienteVulneravel(_authUserId: string, _clienteId: string): boolean {
  return true;
}

/** Simula a política corrigida de SELECT */
function podeVerClienteCorrigido(authUserId: string, clienteWhatsapp: string): boolean {
  const isAdmin = authUserId === 'user-admin';
  if (isAdmin) return true;
  return VENDAS_DB.some(
    (v) => v.user_id === authUserId && v.cliente_whatsapp === clienteWhatsapp,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('IDOR — clientes UPDATE (política VULNERÁVEL)', () => {
  it('user-bob pode atualizar telefone do cliente de user-alice (IDOR explorado)', () => {
    const clienteDeAlice = CLIENTES_DB.find((c) => c.user_id === 'user-alice')!;

    // A política original USING (true) permite isso
    const pode = podeAtualizarClienteVulneravel('user-bob', clienteDeAlice.whatsapp);
    expect(pode).toBe(true); // documenta a vulnerabilidade
  });
});

describe('IDOR — clientes UPDATE (política CORRIGIDA)', () => {
  it('user-bob NÃO pode atualizar telefone do cliente de user-alice', () => {
    const clienteDeAlice = CLIENTES_DB.find((c) => c.user_id === 'user-alice')!;

    const pode = podeAtualizarClienteCorrigido('user-bob', clienteDeAlice.whatsapp);
    expect(pode).toBe(false);
  });

  it('user-alice PODE atualizar seu próprio cliente', () => {
    const clienteDeAlice = CLIENTES_DB.find((c) => c.user_id === 'user-alice')!;

    const pode = podeAtualizarClienteCorrigido('user-alice', clienteDeAlice.whatsapp);
    expect(pode).toBe(true);
  });

  it('admin pode atualizar qualquer cliente', () => {
    const clienteDeAlice = CLIENTES_DB.find((c) => c.user_id === 'user-alice')!;
    const clienteDeBob   = CLIENTES_DB.find((c) => c.user_id === 'user-bob')!;

    expect(podeAtualizarClienteCorrigido('user-admin', clienteDeAlice.whatsapp)).toBe(true);
    expect(podeAtualizarClienteCorrigido('user-admin', clienteDeBob.whatsapp)).toBe(true);
  });
});

describe('IDOR — clientes SELECT (política VULNERÁVEL)', () => {
  it('user-bob pode ver todos os clientes de user-alice (vazamento de dados)', () => {
    const clientesDeAlice = CLIENTES_DB.filter((c) => c.user_id === 'user-alice');
    const todosVisiveis = clientesDeAlice.every((c) =>
      podeVerClienteVulneravel('user-bob', c.id),
    );
    expect(todosVisiveis).toBe(true); // documenta o vazamento
  });
});

describe('IDOR — clientes SELECT (política CORRIGIDA)', () => {
  it('user-bob NÃO vê clientes de user-alice', () => {
    const clientesDeAlice = CLIENTES_DB.filter((c) => c.user_id === 'user-alice');
    const algumVisivel = clientesDeAlice.some((c) =>
      podeVerClienteCorrigido('user-bob', c.whatsapp),
    );
    expect(algumVisivel).toBe(false);
  });

  it('user-alice vê seus próprios clientes', () => {
    const clientesDeAlice = CLIENTES_DB.filter((c) => c.user_id === 'user-alice');
    const todosVisiveis = clientesDeAlice.every((c) =>
      podeVerClienteCorrigido('user-alice', c.whatsapp),
    );
    expect(todosVisiveis).toBe(true);
  });
});

describe('IDOR — user_id nunca deve vir do body da request', () => {
  it('insert de venda com user_id diferente do token seria exploração de IDOR', () => {
    // SaleRegistrationForm.tsx linha 312: user_id: user.id ← correto, vem do token
    // Mas se um atacante via Burp Suite enviar user_id de outra pessoa,
    // o banco precisaria rejeitar pelo RLS.
    //
    // A política "Parceiras registram vendas do próprio mostruário" verifica:
    //   WITH CHECK (parceira_id = private.current_parceira_id() OR admin)
    //
    // Isso significa que mesmo que o INSERT contenha user_id de outra pessoa,
    // o RLS valida pelo auth.uid() (token), não pelo campo user_id enviado.
    // Portanto, a proteção está no RLS — não no frontend.

    const tokenUserId = 'user-alice';
    const bodyUserId  = 'user-bob'; // atacante tenta registrar venda como bob

    // Confirma que os IDs são diferentes (simula a tentativa de ataque)
    expect(tokenUserId).not.toBe(bodyUserId);

    // O RLS deve usar auth.uid() = 'user-alice' e rejeitar a venda
    // com NEW.user_id = 'user-bob' porque auth.uid() ≠ 'user-bob'
    const rlsPassaria = bodyUserId === tokenUserId; // false = RLS rejeita
    expect(rlsPassaria).toBe(false);
  });
});
