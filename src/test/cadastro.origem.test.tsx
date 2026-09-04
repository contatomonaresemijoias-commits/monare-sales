import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchAddressByCEP } from '@/lib/validacao';
import CadastroRevendedora from '@/pages/CadastroRevendedora';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

// Serviços externos e calendário não fazem parte da seleção da origem.
// As validações do formulário e os controles de opções são os reais.
vi.mock('@/components/landing/TurnstileWidget', () => ({ default: () => null }));
vi.mock('@/lib/turnstile', () => ({ podeAvancarEtapa1: () => true }));
vi.mock('@/components/ui/date-picker-input', () => ({
  DatePickerInput: ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => (
    <input aria-label="Data de nascimento" value={value} onChange={(event) => onValueChange(event.target.value)} />
  ),
}));
vi.mock('@/lib/validacao', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/validacao')>(),
  fetchAddressByCEP: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchAddressByCEP).mockResolvedValue({ rua: 'Rua de teste', bairro: 'Centro', cidade: 'Sorocaba', estado: 'SP' });
  vi.mocked(supabase.functions.invoke).mockReset().mockResolvedValue({ data: { id: 'cadastro-teste', ok: true }, error: null });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

async function abrirPerfilComercial() {
  render(<MemoryRouter><CadastroRevendedora /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('Seu nome como no documento'), { target: { value: 'Candidata Teste' } });
  fireEvent.change(screen.getByPlaceholderText('(15) 9 9999-9999'), { target: { value: '15987654321' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText(/Etapa 2 de 5/);

  fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '52998224725' } });
  fireEvent.change(screen.getByLabelText('Data de nascimento'), { target: { value: '1986-05-15' } });
  fireEvent.change(screen.getByPlaceholderText('voce@exemplo.com'), { target: { value: 'candidata@example.com' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Solteira' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Não' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText(/Etapa 3 de 5/);

  fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '18010000' } });
  await screen.findByDisplayValue('Rua de teste');
  fireEvent.change(screen.getByPlaceholderText('123'), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText(/Etapa 4 de 5/);

  fireEvent.change(screen.getByPlaceholderText('@seuusuario'), { target: { value: '@candidata_teste' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Mostruário' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Não' }));
  screen.getAllByPlaceholderText('Conte pra gente').forEach((field) => {
    fireEvent.change(field, { target: { value: 'Resposta de teste' } });
  });
}

describe('Cadastro · como conheceu a empresa', () => {
  it('envia Anúncio como anuncio na etapa comercial e na conclusão do cadastro', async () => {
    await abrirPerfilComercial();
    // Clicar no texto do cartão também precisa selecionar a opção.
    fireEvent.click(screen.getByText('Anúncio'));
    expect(screen.getByRole('radio', { name: 'Anúncio' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText(/Etapa 5 de 5/);

    expect(supabase.functions.invoke).toHaveBeenLastCalledWith('reseller-registration', {
      body: expect.objectContaining({ action: 'update_step', step: 4, como_conheceu: 'anuncio' }),
    });
    expect(screen.queryByText('Selecione como você conheceu a marca.')).not.toBeInTheDocument();

    screen.getAllByPlaceholderText('Conte pra gente').forEach((field) => {
      fireEvent.change(field, { target: { value: 'Resposta de teste' } });
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Sim, autorizo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
    await screen.findByText(/Cadastro recebido/i);
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith('reseller-registration', {
      body: expect.objectContaining({ action: 'complete', como_conheceu: 'anuncio' }),
    });
  });

  it('continua exigindo uma seleção quando a origem está vazia', async () => {
    await abrirPerfilComercial();
    const requestsBefore = vi.mocked(supabase.functions.invoke).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Selecione como você conheceu a marca.')).toBeInTheDocument();
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(requestsBefore);
  });
});
