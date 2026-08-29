/**
 * Importação de planilha no Mostruário.
 *
 * O erro que motivou estes testes: o catálogo em memória era carregado só com
 * `ativo = true`, então um SKU que existia no banco mas estava inativo era
 * classificado como "novo" e ia para o `insert` — batendo no UNIQUE de `sku`
 * (23505 / 409) e derrubando a importação inteira.
 *
 * Aqui a planilha e o Supabase são falsos; o que se verifica é a classificação
 * das linhas (preview) e o que a confirmação escreve no banco.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Mostruario from '@/components/admin/Mostruario';

// ---------------------------------------------------------------- planilha

// Linhas cruas devolvidas pelo SheetJS; cada teste reescreve antes do upload.
let linhasPlanilha: unknown[][] = [];

vi.mock('xlsx', () => ({
  read: () => ({ SheetNames: ['Plan1'], Sheets: { Plan1: {} } }),
  utils: { sheet_to_json: () => linhasPlanilha },
}));

// ---------------------------------------------------------------- supabase

type Produto = { id: string; sku: string; nome: string; ativo: boolean; preco_venda: number };

let catalogo: Produto[] = [];
// Toda chamada de escrita fica registrada aqui para as asserções.
const escritas: { tabela: string; op: string; payload: unknown }[] = [];

/**
 * Builder encadeável no formato do supabase-js: os filtros devolvem `this` e o
 * objeto é "thenable", então `await` em qualquer ponto da cadeia resolve.
 */
function builder(tabela: string) {
  const estado: { op: string; payload: unknown } = { op: 'select', payload: null };
  // Filtros aplicados de verdade — é assim que um `.eq('ativo', true)` esquecido
  // na leitura do catálogo aparece no teste.
  const filtros: { col: string; valores: unknown[] }[] = [];

  const filtrar = (linhas: Produto[]) =>
    filtros.reduce(
      (acc, f) => acc.filter((l) => f.valores.includes((l as unknown as Record<string, unknown>)[f.col])),
      linhas,
    );

  const resolver = (): { data: unknown; error: null } => {
    if (estado.op === 'select' && tabela === 'produtos') return { data: filtrar(catalogo), error: null };
    if (estado.op === 'select' && tabela === 'profiles') {
      return { data: [{ user_id: 'u-1', display_name: 'Ana', ativo: true }], error: null };
    }
    if (estado.op === 'select') return { data: [], error: null };
    if (estado.op === 'insert' && tabela === 'produtos') {
      const criados = (estado.payload as Omit<Produto, 'id'>[]).map((p, i) => ({
        ...p,
        id: `novo-${i}`,
      }));
      catalogo = [...catalogo, ...criados];
      return { data: criados, error: null };
    }
    return { data: null, error: null };
  };

  const chain: Record<string, unknown> = {
    then: (ok: (r: unknown) => unknown) => Promise.resolve(resolver()).then(ok),
  };
  for (const passthrough of ['select', 'order', 'single', 'limit']) {
    chain[passthrough] = () => chain;
  }
  chain.eq = (col: string, valor: unknown) => {
    filtros.push({ col, valores: [valor] });
    return chain;
  };
  chain.in = (col: string, valores: unknown[]) => {
    filtros.push({ col, valores });
    return chain;
  };
  for (const op of ['insert', 'update', 'upsert', 'delete']) {
    chain[op] = (payload: unknown) => {
      estado.op = op;
      estado.payload = payload;
      escritas.push({ tabela, op, payload });
      return chain;
    };
  }
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (tabela: string) => builder(tabela) },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

// ---------------------------------------------------------------- helpers

const CABECALHO = ['Código', 'Produto', 'Un', 'Quantidade', 'Valor unitário', 'Valor total'];

function produto(sku: string, nome: string, preco: number, ativo = true): Produto {
  return { id: `id-${sku}`, sku, nome, ativo, preco_venda: preco };
}

/** Sobe a planilha e espera o modal de pré-visualização abrir. */
async function importar(linhas: unknown[][]) {
  linhasPlanilha = [CABECALHO, ...linhas];
  const { container } = render(<Mostruario />);
  await screen.findAllByText('Ana');

  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const arquivo = new File(['x'], 'maleta.xlsx');
  // O componente lê o arquivo antes de chamar o SheetJS (que está mockado).
  arquivo.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8));
  fireEvent.change(input, { target: { files: [arquivo] } });

  return screen.findByText('Pré-visualização da importação');
}

/** Bloco do preview cujo título contém `titulo` (ex.: "Novos produtos"). */
function secao(titulo: string | RegExp) {
  return screen.getByText(titulo).closest('div') as HTMLElement;
}

beforeEach(() => {
  escritas.length = 0;
  linhasPlanilha = [];
  catalogo = [];
});

// ---------------------------------------------------------------- testes

describe('Mostruário · pré-visualização da importação', () => {
  it('classifica SKU ativo já cadastrado como existente, não como novo', async () => {
    catalogo = [produto('PM3002', 'Pulseira Riviera', 114.9)];
    await importar([['PM3002', 'Pulseira Riviera', 'UN', 1, '114,90', '114,90']]);

    expect(screen.getByText('1 já cadastrado(s)')).toBeInTheDocument();
    expect(screen.getByText('0 novo(s) a criar')).toBeInTheDocument();
  });

  it('classifica SKU inativo já cadastrado como existente e marca para reativar', async () => {
    catalogo = [produto('ANM1005-DOU', 'Anel Aparador', 95.9, false)];
    await importar([['ANM1005-DOU', 'Anel Aparador', 'UN', 1, '95,90', '95,90']]);

    expect(screen.getByText('1 já cadastrado(s)')).toBeInTheDocument();
    expect(screen.getByText('0 novo(s) a criar')).toBeInTheDocument();
    expect(screen.getByText('1 inativo(s) a reativar')).toBeInTheDocument();
    expect(screen.getByText(/inativo · será reativado/)).toBeInTheDocument();
  });

  it('não trata como novo um SKU que só difere na caixa das letras', async () => {
    catalogo = [produto('PIM4000', 'Pingente Coração Vazado', 34.9)];
    await importar([['pim4000', 'Pingente Coração Vazado', 'UN', 1, '34,90', '34,90']]);

    expect(screen.getByText('0 novo(s) a criar')).toBeInTheDocument();
    expect(screen.getByText('1 já cadastrado(s)')).toBeInTheDocument();
  });

  it('mantém como novo o SKU que realmente não existe no catálogo', async () => {
    catalogo = [produto('PM3002', 'Pulseira Riviera', 114.9)];
    await importar([['S01', 'Sacola Monarê', 'UN', 3, '4,00', '12,00']]);

    expect(screen.getByText('1 novo(s) a criar')).toBeInTheDocument();
    expect(within(secao(/Novos produtos/)).getByText('S01')).toBeInTheDocument();
  });
});

describe('Mostruário · confirmação da importação', () => {
  async function confirmar() {
    fireEvent.click(screen.getByRole('button', { name: /Confirmar importação/ }));
    await waitFor(() => expect(escritas.some((e) => e.tabela === 'estoque')).toBe(true));
  }

  const skusInseridos = () =>
    escritas
      .filter((e) => e.tabela === 'produtos' && e.op === 'insert')
      .flatMap((e) => (e.payload as { sku: string }[]).map((p) => p.sku));

  it('cria no banco apenas o SKU inexistente', async () => {
    catalogo = [produto('PM3002', 'Pulseira Riviera', 114.9)];
    await importar([
      ['PM3002', 'Pulseira Riviera', 'UN', 1, '114,90', '114,90'],
      ['S01', 'Sacola Monarê', 'UN', 3, '4,00', '12,00'],
    ]);
    await confirmar();

    expect(skusInseridos()).toEqual(['S01']);
  });

  it('reativa o produto inativo em vez de inserir de novo (evita o 23505)', async () => {
    catalogo = [produto('ANM1005-DOU', 'Anel Aparador', 95.9, false)];
    await importar([['ANM1005-DOU', 'Anel Aparador', 'UN', 1, '95,90', '95,90']]);
    await confirmar();

    expect(skusInseridos()).toEqual([]);
    expect(
      escritas.some(
        (e) =>
          e.tabela === 'produtos' &&
          e.op === 'update' &&
          (e.payload as { ativo?: boolean }).ativo === true,
      ),
    ).toBe(true);
  });

  it('não insere produto nenhum quando todos os SKUs já existem', async () => {
    catalogo = [produto('PM3002', 'Pulseira Riviera', 114.9), produto('PIM4000', 'Pingente', 34.9)];
    await importar([
      ['PM3002', 'Pulseira Riviera', 'UN', 1, '114,90', '114,90'],
      ['PIM4000', 'Pingente', 'UN', 2, '34,90', '69,80'],
    ]);
    await confirmar();

    expect(escritas.filter((e) => e.tabela === 'produtos' && e.op === 'insert')).toHaveLength(0);
  });

  it('não cria produto para linha sem preço válido no arquivo', async () => {
    catalogo = [];
    await importar([['XPTO1', 'Peça sem preço', 'UN', 1, '', '']]);

    expect(screen.getByText('1 ignorado(s)')).toBeInTheDocument();
    expect(screen.getByText(/Sem preço válido no arquivo/)).toBeInTheDocument();
  });
});
