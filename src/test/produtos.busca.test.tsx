/**
 * Busca do catálogo na aba Produtos.
 *
 * A busca é local (o catálogo inteiro já está em memória) e casa por SKU ou por
 * nome, ignorando caixa e acento. Os testes cobrem o que a admin espera ver e,
 * principalmente, o que ela NÃO deve ver: resultado de outra busca, produto
 * escondido dentro de categoria recolhida, ou casamento por nome de categoria.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Produtos from '@/components/admin/Produtos';

type Produto = {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  preco_venda: number;
  categoria_id: string | null;
};

const CATEGORIAS = [
  { id: 'cat-aneis', nome: 'Anéis', prefixo: 'ANM' },
  { id: 'cat-pingentes', nome: 'Pingentes', prefixo: 'PIM' },
];

let catalogo: Produto[] = [];

function produto(
  sku: string,
  nome: string,
  categoria_id: string | null = null,
  preco_venda = 99.9,
): Produto {
  return { id: `id-${sku}`, sku, nome, descricao: null, ativo: true, preco_venda, categoria_id };
}

vi.mock('@/integrations/supabase/client', () => {
  const builder = (tabela: string) => {
    const chain: Record<string, unknown> = {
      then: (ok: (r: unknown) => unknown) =>
        Promise.resolve({
          data: tabela === 'produtos' ? catalogo : CATEGORIAS,
          error: null,
        }).then(ok),
    };
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete']) {
      chain[m] = () => chain;
    }
    return chain;
  };
  return { supabase: { from: (tabela: string) => builder(tabela) } };
});

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

/** Renderiza a aba e espera o catálogo carregar. */
async function abrirCatalogo() {
  render(<Produtos />);
  await screen.findByText(/^Catálogo/);
}

function buscar(termo: string) {
  fireEvent.change(screen.getByPlaceholderText('Buscar por SKU ou nome...'), {
    target: { value: termo },
  });
}

beforeEach(() => {
  catalogo = [
    produto('ANM1005-DOU', 'Anel Aparador', 'cat-aneis'),
    produto('ANM1012-PRA', 'Anel Virgínia', 'cat-aneis'),
    produto('PIM4000', 'Pingente Coração Vazado', 'cat-pingentes'),
    produto('S01', 'Sacola Monarê'),
  ];
});

describe('Produtos · busca por SKU ou nome', () => {
  it('encontra pelo trecho do SKU', async () => {
    await abrirCatalogo();
    buscar('anm1012');

    expect(screen.getByText('ANM1012-PRA')).toBeInTheDocument();
    expect(screen.queryByText('ANM1005-DOU')).not.toBeInTheDocument();
    expect(screen.queryByText('PIM4000')).not.toBeInTheDocument();
  });

  it('encontra pelo nome ignorando acento e caixa', async () => {
    await abrirCatalogo();
    buscar('CORACAO');

    expect(screen.getByText('PIM4000')).toBeInTheDocument();
    expect(screen.getByText('Pingente Coração Vazado')).toBeInTheDocument();
    expect(screen.queryByText('S01')).not.toBeInTheDocument();
  });

  it('mostra o resultado mesmo com a categoria recolhida', async () => {
    await abrirCatalogo();
    // Recolhe "Anéis" e confirma que sumiu da tela.
    fireEvent.click(screen.getByText('Anéis'));
    expect(screen.queryByText('ANM1005-DOU')).not.toBeInTheDocument();

    buscar('aparador');
    expect(screen.getByText('ANM1005-DOU')).toBeInTheDocument();
  });

  it('mostra o total filtrado no cabeçalho e restaura ao limpar', async () => {
    await abrirCatalogo();
    expect(screen.getByText('Catálogo (4)')).toBeInTheDocument();

    buscar('anel');
    expect(screen.getByText('Catálogo (2 de 4)')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Limpar busca'));
    expect(screen.getByText('Catálogo (4)')).toBeInTheDocument();
    expect(screen.getByText('S01')).toBeInTheDocument();
  });

  it('não retorna nada para termo sem correspondência', async () => {
    await abrirCatalogo();
    buscar('colar');

    expect(screen.getByText('Nenhum produto encontrado para "colar".')).toBeInTheDocument();
    expect(screen.getByText('Catálogo (0 de 4)')).toBeInTheDocument();
    expect(screen.queryByText('ANM1005-DOU')).not.toBeInTheDocument();
  });

  it('não casa pelo nome da categoria, só por SKU e nome do produto', async () => {
    await abrirCatalogo();
    buscar('pingentes');

    expect(screen.getByText(/Nenhum produto encontrado/)).toBeInTheDocument();
    expect(screen.queryByText('PIM4000')).not.toBeInTheDocument();
  });
});
