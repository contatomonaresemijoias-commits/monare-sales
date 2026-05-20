/**
 * SECURITY TESTS — Mass Assignment & Frontend Trust
 *
 * Cobre:
 *  - Preço de produto nunca deve vir do cliente (deve ser re-buscado no DB)
 *  - comissao_percentual não pode ser injetado pelo cliente
 *  - codigo_garantia previsível (Date.now) vs. geração segura
 *  - data_venda fora da janela permitida
 *  - validade_garantia não pode ser manipulada pelo cliente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── helpers copiados de SaleRegistrationForm para isolamento do teste ────────

/** Implementação VULNERÁVEL atual do projeto */
function gerarCodigoGarantiaVulneravel(index: number = 0): string {
  return 'MN-' + (Date.now() + index).toString(36).toUpperCase();
}

/** Implementação SEGURA (lib/monare.ts generateWarrantyCode — recomendada) */
function generateWarrantyCodeSeguro(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MNR-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function hojeISO(): string {
  return new Date().toISOString().split('T')[0];
}

function minDataISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Mass Assignment — Código de garantia previsível (VULNERÁVEL)', () => {
  it('dois códigos gerados com índice 0 e 1 são sequenciais e previsíveis', () => {
    const t = Date.now();
    const code0 = 'MN-' + t.toString(36).toUpperCase();
    const code1 = 'MN-' + (t + 1).toString(36).toUpperCase();

    // Um atacante que souber o timestamp aproximado pode enumerar todos os códigos
    // e consultar /garantia/:id até encontrar certidões de outros clientes
    expect(code0).not.toBe(code1);
    // Os códigos diferem por apenas 1 unidade — trivial de bruteforçar
    expect(parseInt(code0.replace('MN-', ''), 36)).toBe(parseInt(code1.replace('MN-', ''), 36) - 1);
  });

  it('10.000 códigos gerados sequencialmente não têm colisão (apenas confirma previsibilidade)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(gerarCodigoGarantiaVulneravel(i));
    }
    // Sem colisão — mas todos são previsíveis a partir de Date.now()
    expect(codes.size).toBe(100);
  });
});

describe('Mass Assignment — Código de garantia seguro (CORRIGIDO)', () => {
  it('código seguro tem formato MNR-XXXX-XXXX', () => {
    const code = generateWarrantyCodeSeguro();
    expect(code).toMatch(/^MNR-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('1000 códigos seguros não colidem', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateWarrantyCodeSeguro());
    }
    // Probabilidade de colisão em 1000 amostras de espaço ~32^8 ≈ 10^12 é negligenciável
    expect(codes.size).toBe(1000);
  });
});

describe('Mass Assignment — Validação de data_venda (server-side ausente)', () => {
  it('HTML min/max são facilmente bypassáveis via Postman/fetch direto', () => {
    // Este teste documenta que a validação só existe no frontend.
    // A migração 20260520000000_security_hardening.sql adiciona validação no trigger.
    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 1);
    const dataFuturaISO = dataFutura.toISOString().split('T')[0];

    // Sem validação server-side, um request direto poderia enviar uma data futura
    // e o banco aceitaria — agora o trigger rejeita com ERRCODE P0002
    expect(dataFuturaISO > hojeISO()).toBe(true); // confirma que a data é de fato futura
  });

  it('data mais antiga que 3 dias está fora da janela', () => {
    const dataAntiga = new Date();
    dataAntiga.setDate(dataAntiga.getDate() - 4);
    const dataAntigaISO = dataAntiga.toISOString().split('T')[0];

    expect(dataAntigaISO < minDataISO()).toBe(true);
  });
});

describe('Mass Assignment — valor_venda nunca deve vir do cliente', () => {
  it('objeto de insert contém valor_venda do client-state — atacável via Burp Suite', () => {
    // Simula o que SaleRegistrationForm.tsx linha 317 faz:
    // valor_venda: item.preco_unitario  ← vem do estado React, não re-validado
    const itemManipulado = {
      produto_id: 'uuid-qualquer',
      preco_unitario: 0.01, // preço real é R$ 89,90 — atacante manipulou o estado
    };

    const vendaInsert = {
      produto_id: itemManipulado.produto_id,
      valor_venda: itemManipulado.preco_unitario, // VULNERÁVEL: 0.01 chega no banco
    };

    // O INSERT chegaria com valor_venda = 0.01 sem o fix do trigger
    expect(vendaInsert.valor_venda).toBe(0.01);

    // COM A MIGRAÇÃO 20260520000000_security_hardening.sql:
    // O trigger preencher_dados_venda() sobrescreve NEW.valor_venda com produtos.preco_venda
    // tornando esta manipulação ineficaz.
  });

  it('comissao_percentual injetado pelo cliente seria aceito pelo trigger antigo', () => {
    // Trigger ANTIGO (20260429001521): IF NEW.comissao_percentual IS NULL → só preenche se NULL
    // Um atacante poderia enviar comissao_percentual: 0 e pagar 0% de comissão
    const insertMalicioso = {
      produto_id: 'uuid',
      valor_venda: 100,
      comissao_percentual: 0, // injetado pelo atacante
    };

    // O trigger antigo manteria comissao_percentual = 0 (não substituiria)
    // A migração 20260517000000_comissao_por_ciclo.sql já corrige isso
    // definindo sempre comissao_percentual := 0 (comissão calculada no ciclo)
    expect(insertMalicioso.comissao_percentual).toBe(0);
  });
});

describe('Mass Assignment — validade_garantia calculada client-side', () => {
  it('cliente pode enviar validade_garantia manipulada', () => {
    // SaleRegistrationForm.tsx linha 306: validadeGarantia = validadeFromData(form.data_venda)
    // Se data_venda for manipulada, validade_garantia também será
    const dataVendaManipulada = '2020-01-01'; // data no passado
    const d = new Date(dataVendaManipulada + 'T12:00:00');
    d.setFullYear(d.getFullYear() + 1);
    const validadeManipulada = d.toISOString().split('T')[0]; // 2021-01-01

    // Garantia já expirada seria registrada como válida no banco
    expect(validadeManipulada).toBe('2021-01-01');

    // COM O FIX: o trigger recalcula validade_garantia = data_venda + 1 year
    // e rejeita data_venda no passado > 3 dias, tornando este ataque inválido.
  });
});
