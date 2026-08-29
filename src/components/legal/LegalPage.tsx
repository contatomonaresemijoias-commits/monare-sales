import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Marca um trecho que depende de decisão da Monarê (jurídica ou comercial) e
 * que ninguém deve publicar em branco. Fica visualmente evidente de propósito.
 */
export function Pendencia({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-[2px] bg-rosa/15 px-1.5 py-0.5 font-medium text-rosa">
      [definir: {children}]
    </mark>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 font-serif text-[22px] font-semibold text-ink">{titulo}</h2>
      <div className="space-y-3 text-[15px] leading-[1.75] text-ink-soft">{children}</div>
    </section>
  );
}

export default function LegalPage({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bege-light font-poppins text-ink antialiased">
      <div className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-10 sm:px-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-rosa"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>

        <header className="mb-10 border-b border-border pb-8">
          <span className="mb-2 block font-serif text-[32px] font-normal uppercase leading-none tracking-[0.15em] text-rosa">
            Monarê
          </span>
          <h1 className="mb-2 font-serif text-[30px] font-medium leading-tight text-ink">{titulo}</h1>
          <p className="text-xs text-ink-soft">Última atualização: {atualizadoEm}</p>
        </header>

        {children}

        <footer className="mt-12 border-t border-border pt-6 text-xs text-ink-soft">
          <p>© Monarê Semijoias</p>
        </footer>
      </div>
    </div>
  );
}
