import { useEffect } from 'react';

type Meta = {
  title: string;
  description?: string;
  /** `true` em telas internas: pede pros buscadores não indexarem. */
  noIndex?: boolean;
};

function setMetaTag(seletor: string, attr: 'name' | 'property', chave: string, valor: string) {
  let el = document.head.querySelector<HTMLMetaElement>(seletor);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, chave);
    document.head.appendChild(el);
  }
  el.setAttribute('content', valor);
  return el;
}

/**
 * Ajusta título/description/robots por rota.
 *
 * Atenção: isso roda no cliente. Serve pra aba do navegador e pros buscadores
 * que executam JS (Google). Os scrapers de link do WhatsApp, Instagram e
 * Facebook NÃO executam JS — eles leem o `index.html` estático. Por isso o
 * `index.html` carrega as meta tags da landing, que é a página compartilhada.
 * Para OG por rota seria preciso pré-renderizar ou tratar no host.
 */
export default function usePageMeta({ title, description, noIndex }: Meta) {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = title;

    if (description) {
      setMetaTag('meta[name="description"]', 'name', 'description', description);
    }

    let robots: HTMLMetaElement | null = null;
    if (noIndex) {
      robots = setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
    }

    return () => {
      document.title = tituloAnterior;
      robots?.remove();
    };
  }, [title, description, noIndex]);
}
