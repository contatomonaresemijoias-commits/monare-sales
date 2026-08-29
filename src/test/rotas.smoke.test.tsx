import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { CADASTRO_PATH, PAINEL_PATH } from '@/content/landing';
import NotFound from '@/pages/NotFound';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

/**
 * Espelha a tabela de rotas de App.tsx com telas de mentira no lugar das reais.
 * O que importa aqui é para onde cada caminho resolve — montar Index/Admin de
 * verdade exigiria Supabase e sessão, que não são o objeto deste teste.
 */
function Sonda({ nome }: { nome: string }) {
  const { pathname } = useLocation();
  return <div data-testid="tela" data-path={pathname}>{nome}</div>;
}

function renderRota(entrada: string) {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/" element={<Sonda nome="landing" />} />
        <Route path={CADASTRO_PATH} element={<Sonda nome="cadastro" />} />
        <Route path={PAINEL_PATH} element={<Sonda nome="painel" />} />
        <Route path="/admin" element={<Sonda nome="admin" />} />
        <Route path="/auth" element={<Sonda nome="auth" />} />
        <Route path="/seja-representante" element={<Navigate to="/" replace />} />
        <Route
          path="/seja-representante/cadastro"
          element={<Navigate to={CADASTRO_PATH} replace />}
        />
        <Route path="/seja-revendedora" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Escopado ao container do próprio render: alguns testes checam mais de um
 * caminho, e tanto o `screen` quanto as queries devolvidas por `render` estão
 * ligadas ao `document.body` — enxergariam as duas árvores ao mesmo tempo.
 */
function telaEm(entrada: string) {
  const { container } = renderRota(entrada);
  return within(container).getByTestId('tela');
}

describe('mapa de rotas', () => {
  it('serve a landing pública na raiz do domínio', () => {
    expect(telaEm('/')).toHaveTextContent('landing');
  });

  it('mantém o app interno fora da raiz', () => {
    expect(telaEm(PAINEL_PATH)).toHaveTextContent('painel');
    expect(PAINEL_PATH).not.toBe('/');
  });

  it('leva os caminhos antigos divulgados para os novos', () => {
    expect(telaEm('/seja-representante')).toHaveTextContent('landing');
    expect(telaEm('/seja-representante/cadastro')).toHaveTextContent('cadastro');
  });

  it('atende "revendedora" como sinônimo previsível de "representante"', () => {
    expect(telaEm('/seja-revendedora')).toHaveTextContent('landing');
  });

  it('não redireciona caminho desconhecido: mostra o 404 com a URL digitada', () => {
    renderRota('/pagina-que-nao-existe');
    expect(screen.getByRole('heading', { name: /esta página não existe/i })).toBeTruthy();
    expect(screen.getByText('/pagina-que-nao-existe')).toBeTruthy();
  });

  it('dá duas saídas no 404, e nenhuma delas é um beco de login', () => {
    renderRota('/xyz');
    const paraLanding = screen.getByRole('link', { name: /conhecer a monarê/i });
    const paraConta = screen.getByRole('link', { name: /acessar minha conta/i });
    expect(paraLanding.getAttribute('href')).toBe('/');
    expect(paraConta.getAttribute('href')).toBe('/auth');
  });
});
