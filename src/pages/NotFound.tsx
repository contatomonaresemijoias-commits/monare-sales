import { Link, useLocation } from 'react-router-dom';
import { Gem } from 'lucide-react';
import usePageMeta from '@/hooks/usePageMeta';

/**
 * Caminho inexistente. Deliberadamente NÃO redireciona sozinho para a home:
 * quem errou a URL precisa ver o que digitou para conseguir corrigir, e um
 * redirect silencioso ainda apagaria o rastro de link quebrado (material
 * impresso, bio do Instagram) que só o 404 denuncia.
 *
 * Sinônimos previsíveis de rotas reais são tratados como redirect em App.tsx —
 * não caem aqui.
 */
export default function NotFound() {
  const { pathname } = useLocation();

  usePageMeta({ title: 'Página não encontrada — Monarê', noIndex: true });

  return (
    <div className="min-h-screen bg-bege-light font-poppins text-ink antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center px-6 py-16 text-center">
        <Gem className="mb-5 text-rosa" size={30} />

        <span className="mb-2.5 block font-serif text-[38px] font-normal uppercase leading-none tracking-[0.15em] text-rosa">
          Monarê
        </span>
        <span className="mb-8 block text-[11px] uppercase tracking-[0.35em] text-ink-soft">
          Semijoias
        </span>

        <h1 className="mb-4 font-serif text-[30px] font-medium leading-[1.25] text-ink sm:text-[36px]">
          Esta página não existe
        </h1>

        <p className="mb-4 text-[15px] leading-[1.7] text-ink-soft">
          Não encontramos nada em:
        </p>

        {/* Mostrar o caminho é o que permite a quem errou a digitação perceber o erro. */}
        <code className="mb-8 max-w-full overflow-x-auto rounded-[4px] border border-border bg-white px-3 py-2 font-mono text-[13px] text-ink">
          {pathname}
        </code>

        <p className="mb-9 text-[15px] leading-[1.7] text-ink-soft">
          Confira o endereço ou siga por um destes caminhos.
        </p>

        <div className="flex w-full flex-col items-center gap-3">
          <Link
            to="/"
            className="inline-block w-full max-w-[320px] rounded-[8px] bg-rosa px-6 py-[18px] text-center text-[13px] font-medium uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-px hover:bg-rosa/90"
          >
            Conhecer a Monarê
          </Link>
          <Link
            to="/auth"
            className="inline-block w-full max-w-[320px] rounded-[8px] border border-border bg-white px-6 py-[18px] text-center text-[13px] font-medium uppercase tracking-[0.1em] text-ink transition-all hover:-translate-y-px hover:border-rosa-light hover:text-rosa"
          >
            Acessar minha conta
          </Link>
        </div>
      </div>
    </div>
  );
}
