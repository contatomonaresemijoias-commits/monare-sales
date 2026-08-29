import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SejaRevendedora from '@/pages/SejaRevendedora';
import { CADASTRO_PATH } from '@/content/landing';

function renderLanding() {
  return render(
    <MemoryRouter>
      <SejaRevendedora />
    </MemoryRouter>,
  );
}

describe('landing na raiz do domínio', () => {
  it('renderiza as seções do modelo', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: /círculo social/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /o que falam sobre nós/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /como funciona/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /dúvidas frequentes/i })).toBeTruthy();
  });

  it('aponta os CTAs para o cadastro', () => {
    renderLanding();
    const ctas = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === CADASTRO_PATH);
    expect(ctas.length).toBeGreaterThanOrEqual(2);
  });

  it('fecha a página com o CTA depois do FAQ', () => {
    renderLanding();
    const faq = screen.getByRole('heading', { name: /dúvidas frequentes/i });
    const cta = screen.getByRole('heading', { name: /pronta para começar/i });
    const ctaVemDepois = faq.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(ctaVemDepois).toBeTruthy();
  });

  it('oferece a saída por WhatsApp e os documentos legais', () => {
    renderLanding();
    const whatsapp = screen.getByRole('link', { name: /whatsapp/i });
    expect(whatsapp.getAttribute('href')).toContain('wa.me/');
    expect(screen.getByRole('link', { name: /termos para revendedoras/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toBeTruthy();
  });

  it('publica todas as fotos, sem espaço reservado visível', () => {
    renderLanding();
    const slots = screen.queryAllByRole('img', { name: /espaço reservado/i });
    // hero, galeria e avaliações já têm foto publicada: nenhum placeholder sobra.
    expect(slots).toHaveLength(0);
  });

  it('publica os prints das avaliações no carrossel', () => {
    renderLanding();
    const prints = screen.getAllByRole('img', { name: /avaliação de revendedora monarê/i });
    expect(prints).toHaveLength(11);
    expect(prints[0].getAttribute('src')).toBe('/imagens/avaliacoes/avaliacao-01.png');
    expect(prints[10].getAttribute('src')).toBe('/imagens/avaliacoes/avaliacao-11.png');
  });

  it('traz a seção Sobre nós ancorada no menu', () => {
    const { container } = renderLanding();
    const titulo = screen.getByRole('heading', { name: /^sobre nós$/i });
    expect(titulo).toBeTruthy();
    expect(container.querySelector('#sobre')).toBeTruthy();

    const link = screen.getAllByRole('link', { name: /sobre nós/i })[0];
    expect(link.getAttribute('href')).toBe('#sobre');
  });

  it('monta as avaliações como carrossel navegável', () => {
    renderLanding();
    const carrossel = screen.getByRole('region', { name: /avaliações de revendedoras/i });
    expect(carrossel.getAttribute('aria-roledescription')).toBe('carousel');
    expect(screen.getByRole('button', { name: /avaliação anterior/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /próxima avaliação/i })).toBeTruthy();
  });

  it('monta a galeria como carrossel navegável', () => {
    renderLanding();
    const carrossel = screen.getByRole('region', { name: /galeria de semijoias monarê/i });
    expect(carrossel.getAttribute('aria-roledescription')).toBe('carousel');
    expect(screen.getByRole('button', { name: /fotos anteriores/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /próximas fotos/i })).toBeTruthy();
  });

  it('avança sozinho e pausa quando a pessoa passa o mouse', () => {
    vi.useFakeTimers();
    try {
      renderLanding();
      const carrossel = screen.getByRole('region', { name: /avaliações de revendedoras/i });

      // O embla não faz layout no jsdom, então o sinal observável é o timer:
      // com a seção em repouso ele existe; com o mouse em cima, não.
      // (Há mais de um carrossel na página — galeria e avaliações — então o
      // teste mede o delta do próprio carrossel, não o total da página.)
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const timersEmRepouso = vi.getTimerCount();
      expect(timersEmRepouso).toBeGreaterThan(0);

      act(() => {
        fireEvent.mouseEnter(carrossel);
      });
      expect(vi.getTimerCount()).toBe(timersEmRepouso - 1);

      act(() => {
        fireEvent.mouseLeave(carrossel);
      });
      expect(vi.getTimerCount()).toBe(timersEmRepouso);
    } finally {
      vi.useRealTimers();
    }
  });

  it('não monta o formulário de cadastro nesta página', () => {
    renderLanding();
    expect(screen.queryByLabelText(/nome completo/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /enviar cadastro/i })).toBeNull();
  });
});
