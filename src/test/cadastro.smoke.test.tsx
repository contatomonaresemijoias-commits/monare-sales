import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// O client real exige as variáveis do Supabase; aqui só interessa a UI.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import CadastroRevendedora from '@/pages/CadastroRevendedora';

function renderCadastro() {
  return render(
    <MemoryRouter>
      <CadastroRevendedora />
    </MemoryRouter>,
  );
}

describe('cadastro /cadastro', () => {
  it('abre numa etapa leve: só nome e WhatsApp', () => {
    renderCadastro();
    expect(screen.getByPlaceholderText(/seu nome como no documento/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/\(15\)/)).toBeTruthy();
    expect(screen.getByText(/etapa 1 de 5/i)).toBeTruthy();
  });

  it('não pede CPF, nascimento nem e-mail antes de capturar o lead', () => {
    renderCadastro();
    expect(screen.queryByPlaceholderText(/000\.000\.000-00/)).toBeNull();
    expect(screen.queryByPlaceholderText(/voce@exemplo\.com/)).toBeNull();
  });

  it('linka os documentos que a candidata precisa aceitar', () => {
    renderCadastro();
    const termos = screen.getByRole('link', { name: /termos para revendedoras/i });
    const politica = screen.getAllByRole('link', { name: /política de privacidade/i });
    expect(termos.getAttribute('href')).toBe('/termos-revendedora');
    expect(politica[0].getAttribute('href')).toBe('/politica-de-privacidade');
  });

  it('não mostra a confirmação antes do envio', () => {
    renderCadastro();
    expect(screen.queryByText(/cadastro recebido/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /enviar cadastro/i })).toBeNull();
  });
});
