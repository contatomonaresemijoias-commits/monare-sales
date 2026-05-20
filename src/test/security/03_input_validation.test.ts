/**
 * SECURITY TESTS — Validação de Input, Limites de Tamanho e Sanitização
 *
 * Cobre:
 *  - Campos sem limite de tamanho: DoS por strings gigantes
 *  - WhatsApp: formato inválido / injeção de dígitos
 *  - E-mail no edge function: sem validação server-side
 *  - Senha: sem requisitos de complexidade
 *  - Número de itens na venda: sem limite (DoS por array gigante)
 *  - SKU: entrada maliciosa não sanitizada antes de query
 */

import { describe, it, expect } from 'vitest';
import { formatWhatsApp, normalizeSKU } from '@/lib/monare';

// ─── Simulações de regras de validação server-side ────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validarEmailServidor(email: string): { ok: boolean; error?: string } {
  if (!email || typeof email !== 'string') return { ok: false, error: 'E-mail obrigatório' };
  if (email.length > 254) return { ok: false, error: 'E-mail muito longo' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Formato de e-mail inválido' };
  return { ok: true };
}

const MIN_PASSWORD_LEN = 10;
const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':",.<>?/\\|`~])/;

function validarSenhaServidor(password: string): { ok: boolean; error?: string } {
  if (!password) return { ok: false, error: 'Senha obrigatória' };
  if (password.length < MIN_PASSWORD_LEN) return { ok: false, error: `Mínimo ${MIN_PASSWORD_LEN} caracteres` };
  if (!PASSWORD_COMPLEXITY_RE.test(password)) return { ok: false, error: 'Complexidade insuficiente' };
  return { ok: true };
}

function validarNomeCliente(nome: string): { ok: boolean; error?: string } {
  const trimmed = nome.trim();
  if (trimmed.length < 2)   return { ok: false, error: 'Nome muito curto' };
  if (trimmed.length > 120) return { ok: false, error: 'Nome muito longo (máx 120)' };
  return { ok: true };
}

function validarWhatsApp(raw: string): { ok: boolean; error?: string } {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return { ok: false, error: 'Número muito curto' };
  if (digits.length > 11) return { ok: false, error: 'Número muito longo' };
  return { ok: true };
}

const MAX_ITENS_VENDA = 50;

function validarItensVenda(items: unknown[]): { ok: boolean; error?: string } {
  if (items.length === 0)              return { ok: false, error: 'Ao menos um item necessário' };
  if (items.length > MAX_ITENS_VENDA) return { ok: false, error: `Máximo ${MAX_ITENS_VENDA} itens por venda` };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Input Validation — E-mail (server-side)', () => {
  it('rejeita e-mail vazio', () => {
    expect(validarEmailServidor('')).toMatchObject({ ok: false });
  });

  it('rejeita e-mail sem @', () => {
    expect(validarEmailServidor('naoehememail.com')).toMatchObject({ ok: false });
  });

  it('rejeita e-mail com mais de 254 caracteres', () => {
    const longo = 'a'.repeat(250) + '@x.com';
    expect(validarEmailServidor(longo)).toMatchObject({ ok: false });
  });

  it('aceita e-mails válidos', () => {
    expect(validarEmailServidor('usuario@monare.com.br')).toMatchObject({ ok: true });
    expect(validarEmailServidor('user+tag@example.co')).toMatchObject({ ok: true });
  });

  it('rejeita e-mails com espaço (injeção trivial)', () => {
    expect(validarEmailServidor('user @monare.com')).toMatchObject({ ok: false });
  });
});

describe('Input Validation — Senha (complexidade)', () => {
  it('rejeita senha curta (< 10 chars)', () => {
    expect(validarSenhaServidor('Ab1!')).toMatchObject({ ok: false });
    expect(validarSenhaServidor('123456')).toMatchObject({ ok: false }); // mínimo do HTML atual
  });

  it('rejeita senha sem maiúscula', () => {
    expect(validarSenhaServidor('minuscula1!')).toMatchObject({ ok: false });
  });

  it('rejeita senha sem dígito', () => {
    expect(validarSenhaServidor('SemNumero!!!')).toMatchObject({ ok: false });
  });

  it('rejeita senha sem caractere especial', () => {
    expect(validarSenhaServidor('SemEspecial123')).toMatchObject({ ok: false });
  });

  it('aceita senha forte', () => {
    expect(validarSenhaServidor('Senh@Forte123!')).toMatchObject({ ok: true });
    expect(validarSenhaServidor('M0nare$Seguro')).toMatchObject({ ok: true });
  });
});

describe('Input Validation — Nome do cliente', () => {
  it('rejeita nome vazio', () => {
    expect(validarNomeCliente('')).toMatchObject({ ok: false });
    expect(validarNomeCliente('  ')).toMatchObject({ ok: false });
  });

  it('rejeita nome de 1 caractere', () => {
    expect(validarNomeCliente('A')).toMatchObject({ ok: false });
  });

  it('rejeita nome com mais de 120 chars (DoS / overflow)', () => {
    const nome = 'A'.repeat(121);
    expect(validarNomeCliente(nome)).toMatchObject({ ok: false });
  });

  it('aceita nomes válidos', () => {
    expect(validarNomeCliente('Ana Lima')).toMatchObject({ ok: true });
    expect(validarNomeCliente('José da Silva')).toMatchObject({ ok: true });
  });
});

describe('Input Validation — WhatsApp', () => {
  it('rejeita números com menos de 10 dígitos', () => {
    expect(validarWhatsApp('99999')).toMatchObject({ ok: false });
  });

  it('rejeita strings não numéricas (injeção)', () => {
    // formatWhatsApp remove não-dígitos, mas se chegasse direto ao backend...
    const injecao = "'; DROP TABLE clientes; --";
    expect(validarWhatsApp(injecao)).toMatchObject({ ok: false }); // 0 dígitos
  });

  it('aceita número válido de 11 dígitos', () => {
    expect(validarWhatsApp('(11) 99999-9999')).toMatchObject({ ok: true });
    expect(validarWhatsApp('11999999999')).toMatchObject({ ok: true });
  });

  it('formatWhatsApp limita a 11 dígitos (proteção existente)', () => {
    const resultado = formatWhatsApp('119999999999999'); // 15 dígitos
    const digits = resultado.replace(/\D/g, '');
    expect(digits.length).toBeLessThanOrEqual(11);
  });
});

describe('Input Validation — Número de itens (DoS por array)', () => {
  it('rejeita carrinho vazio', () => {
    expect(validarItensVenda([])).toMatchObject({ ok: false });
  });

  it('rejeita mais de 50 itens (DoS)', () => {
    const itensGigantes = Array(51).fill({ produto_id: 'p1', nome: 'X', preco: 10 });
    expect(validarItensVenda(itensGigantes)).toMatchObject({ ok: false });
  });

  it('aceita carrinho com até 50 itens', () => {
    const itens = Array(50).fill({ produto_id: 'p1', nome: 'X', preco: 10 });
    expect(validarItensVenda(itens)).toMatchObject({ ok: true });
  });

  it('um único item é válido', () => {
    expect(validarItensVenda([{ produto_id: 'p1' }])).toMatchObject({ ok: true });
  });
});

describe('Input Validation — SKU normalization', () => {
  it('normalizeSKU remove espaços e converte para maiúsculas', () => {
    expect(normalizeSKU('  bm 1000  ')).toBe('BM1000');
    expect(normalizeSKU('bm1000')).toBe('BM1000');
  });

  it('SKU vazio resulta em string vazia (deve ser rejeitado antes do query)', () => {
    expect(normalizeSKU('')).toBe('');
    // A lógica em lookupSKU verifica skuLimpo.length < 2 antes de consultar o DB
  });

  it('SKU com caracteres especiais é normalizado (sem injeção via ORM)', () => {
    // Supabase usa PostgREST que faz binding paramétrico — sem risco de SQL injection
    // Mas o SKU normalizado evita ambiguidades no lookup
    const skuEspecial = normalizeSKU("BM'; DROP TABLE produtos; --");
    expect(skuEspecial).toBe("BM';DROPTABLEPRODUTOS;--");
    // O PostgREST envia isso como parâmetro binding, não interpolado no SQL
  });
});
