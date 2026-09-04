import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Calendar } from '@/components/ui/calendar';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { MonthYearSelect } from '@/components/ui/month-year-select';

// O Radix mantém a opção selecionada visível ao abrir a lista de anos.
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

async function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: label }), { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name: option }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

function DateField({ initialValue = '2026-09-03', min, max, onChange = vi.fn() }: {
  initialValue?: string;
  min?: string;
  max?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return <DatePickerInput value={value} min={min} max={max} onValueChange={(next) => { setValue(next); onChange(next); }} />;
}

describe('Calendário · escolha direta de mês e ano', () => {
  it('permite escolher uma data de nascimento de 40 anos atrás sem avançar mês a mês', async () => {
    const onChange = vi.fn();
    render(<DateField max="2026-09-03" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '03/09/2026' }));

    await choose('Ano', '1986');
    await choose('Mês', 'maio');

    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('1986');
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('maio');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('grid')).getByRole('gridcell', { name: '15' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('1986-05-15');
    expect(screen.getByRole('button', { name: '15/05/1986' })).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '15/05/1986' }));
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('1986');
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('maio');
  });

  it('consulta um mês quatro meses antes e mantém as setas de navegação sincronizadas', async () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 8, 1)} />);
    await choose('Mês', 'maio');
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('2026');
    expect(screen.getByRole('grid')).toHaveAccessibleName('maio 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('abril');
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('maio');
  });

  it('preserva o limite mínimo e máximo de uma data de venda', async () => {
    const onChange = vi.fn();
    render(<DateField initialValue="2026-09-02" min="2026-09-01" max="2026-09-03" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '02/09/2026' }));
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Mês' }), { key: 'Enter' });
    expect(await screen.findByRole('option', { name: 'agosto' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: 'outubro' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'setembro' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    const grid = within(screen.getByRole('grid'));
    expect(grid.getByRole('gridcell', { name: '4' })).toBeDisabled();
    fireEvent.click(grid.getAllByRole('gridcell', { name: '3' }).find((cell) => !cell.hasAttribute('disabled'))!);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-09-03');
  });

  it('ajusta o mês ao limite permitido quando o ano é alterado', async () => {
    render(<DateField initialValue="2025-12-15" min="2024-03-01" max="2026-09-03" />);
    fireEvent.click(screen.getByRole('button', { name: '15/12/2025' }));
    await choose('Ano', '2026');
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('setembro');

    await choose('Ano', '2025');
    await choose('Mês', 'janeiro');
    await choose('Ano', '2024');
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('março');
  });

  it('não mostra anos futuros quando há data máxima de nascimento', async () => {
    render(<DateField max="2026-09-03" />);
    fireEvent.click(screen.getByRole('button', { name: '03/09/2026' }));
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Ano' }), { key: 'Enter' });
    expect(await screen.findByRole('option', { name: '1986' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '2027' })).not.toBeInTheDocument();
  });

  it('abre e seleciona por clique sem exigir teclado', async () => {
    render(<DateField />);
    fireEvent.click(screen.getByRole('button', { name: '03/09/2026' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Mês' }));
    fireEvent.click(await screen.findByRole('option', { name: 'maio' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('maio');
    expect(screen.getByRole('grid')).toHaveAccessibleName('maio 2026');
  });

  it('permite filtrar relatórios por mês e ano sem precisar escolher um dia', async () => {
    const onChange = vi.fn();
    function MonthField() {
      const [month, setMonth] = useState(new Date(2026, 8, 3));
      return <MonthYearSelect value={month} onValueChange={(next) => { setMonth(next); onChange(next); }} />;
    }
    render(<MonthField />);
    await choose('Mês', 'maio');
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 4, 1));
    await choose('Ano', '2025');
    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 4, 1));
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('maio');
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('2025');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });
});
