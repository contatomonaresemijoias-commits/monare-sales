/**
 * Separação entre o painel comercial (/admin) e o de RH (/rh).
 *
 * Duas coisas são testadas aqui:
 *  1. o roteamento por papel — quem entra onde, e para onde é mandado quando
 *     bate numa porta que não é dele;
 *  2. a regra "RH não mexe no próprio tipo", na forma que o front usa para
 *     decidir quais botões existem.
 *
 * A barreira real está no RLS e na edge function; esta é a camada de cima.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAuth from '@/components/RequireAuth';
import {
  ADMIN_PATH,
  RH_PATH,
  ehPapelProtegido,
  podeGerenciarConta,
  rotaInicial,
} from '@/lib/acesso';
import { PAINEL_PATH } from '@/content/landing';

const useAuthMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

type Sessao = { roles: string[]; ativo?: boolean; logada?: boolean };

function sessao({ roles, ativo = true, logada = true }: Sessao) {
  return {
    user: logada ? { id: 'uid-1' } : null,
    roles,
    loading: false,
    isAdmin: roles.includes('administrador'),
    isRh: roles.includes('rh'),
    isAtivo: ativo,
    signOut: vi.fn(),
  };
}

function Tela({ nome }: { nome: string }) {
  return <div data-testid="tela">{nome}</div>;
}

/** Monta as rotas protegidas de verdade e entra por `entrada`. */
function abrir(entrada: string, s: Sessao) {
  useAuthMock.mockReturnValue(sessao(s));
  const { container } = render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path={PAINEL_PATH} element={<Tela nome="painel" />} />
        <Route
          path={ADMIN_PATH}
          element={
            <RequireAuth papeis={['administrador']}>
              <Tela nome="admin" />
            </RequireAuth>
          }
        />
        <Route
          path={RH_PATH}
          element={
            <RequireAuth papeis={['administrador', 'rh']}>
              <Tela nome="rh" />
            </RequireAuth>
          }
        />
        <Route path="/auth" element={<Tela nome="auth" />} />
      </Routes>
    </MemoryRouter>,
  );
  return within(container);
}

describe('rotaInicial — para onde cada papel vai depois do login', () => {
  it('administrador abre o painel comercial', () => {
    expect(rotaInicial(['administrador'])).toBe(ADMIN_PATH);
  });

  it('rh abre o painel de RH', () => {
    expect(rotaInicial(['rh'])).toBe(RH_PATH);
  });

  it('revendedora e B2B abrem o painel de vendas', () => {
    expect(rotaInicial(['revendedora'])).toBe(PAINEL_PATH);
    expect(rotaInicial(['b2b'])).toBe(PAINEL_PATH);
  });

  it('conta sem papel nenhum não trava: cai no painel comum', () => {
    expect(rotaInicial([])).toBe(PAINEL_PATH);
  });
});

describe('/rh — quem entra', () => {
  it('rh entra', () => {
    expect(abrir(RH_PATH, { roles: ['rh'] }).getByTestId('tela')).toHaveTextContent('rh');
  });

  it('administrador entra junto', () => {
    expect(abrir(RH_PATH, { roles: ['administrador'] }).getByTestId('tela')).toHaveTextContent('rh');
  });

  it('revendedora não entra — volta para o painel dela, sem beco sem saída', () => {
    expect(abrir(RH_PATH, { roles: ['revendedora'] }).getByTestId('tela')).toHaveTextContent('painel');
  });

  it('rh desativada não entra nem no próprio painel', () => {
    abrir(RH_PATH, { roles: ['rh'], ativo: false });
    expect(screen.getByRole('heading', { name: /acesso desativado/i })).toBeTruthy();
  });

  it('sem sessão vai para o login', () => {
    expect(abrir(RH_PATH, { roles: [], logada: false }).getByTestId('tela')).toHaveTextContent('auth');
  });
});

describe('/admin — continua fechado para RH', () => {
  it('rh não vê o painel comercial: é mandado para o de RH', () => {
    expect(abrir(ADMIN_PATH, { roles: ['rh'] }).getByTestId('tela')).toHaveTextContent('rh');
  });

  it('administrador entra', () => {
    expect(abrir(ADMIN_PATH, { roles: ['administrador'] }).getByTestId('tela')).toHaveTextContent('admin');
  });
});

describe('ehPapelProtegido — o alvo que o RH não pode tocar', () => {
  it('administrador e rh são protegidos', () => {
    expect(ehPapelProtegido(['administrador'])).toBe(true);
    expect(ehPapelProtegido(['rh'])).toBe(true);
  });

  it('revendedora e B2B não são', () => {
    expect(ehPapelProtegido(['revendedora'])).toBe(false);
    expect(ehPapelProtegido(['b2b'])).toBe(false);
    expect(ehPapelProtegido([])).toBe(false);
  });

  it('conta que acumula revendedora e rh continua protegida', () => {
    expect(ehPapelProtegido(['revendedora', 'rh'])).toBe(true);
  });
});

describe('podeGerenciarConta — editar, senha, status e excluir de uma vez', () => {
  const comoRh = { souEu: false, souAdmin: false };
  const comoAdmin = { souEu: false, souAdmin: true };

  it('RH gerencia revendedora e B2B — o trabalho dela', () => {
    expect(podeGerenciarConta(['revendedora'], comoRh)).toBe(true);
    expect(podeGerenciarConta(['b2b'], comoRh)).toBe(true);
  });

  it('RH não alcança outra RH: é o que impede uma derrubar a outra', () => {
    expect(podeGerenciarConta(['rh'], comoRh)).toBe(false);
  });

  it('RH não alcança administrador', () => {
    expect(podeGerenciarConta(['administrador'], comoRh)).toBe(false);
  });

  it('revendedora que também é RH está protegida — o papel extra não vale menos', () => {
    expect(podeGerenciarConta(['revendedora', 'rh'], comoRh)).toBe(false);
  });

  it('ninguém gerencia a própria conta, nem o administrador', () => {
    expect(podeGerenciarConta(['revendedora'], { souEu: true, souAdmin: false })).toBe(false);
    expect(podeGerenciarConta(['rh'], { souEu: true, souAdmin: true })).toBe(false);
  });

  it('admin alcança RH, mas nunca outro administrador', () => {
    expect(podeGerenciarConta(['rh'], comoAdmin)).toBe(true);
    expect(podeGerenciarConta(['administrador'], comoAdmin)).toBe(false);
  });

  it('conta sem papel nenhum é gerenciável — senão ficaria órfã na tela', () => {
    expect(podeGerenciarConta([], comoRh)).toBe(true);
  });
});
