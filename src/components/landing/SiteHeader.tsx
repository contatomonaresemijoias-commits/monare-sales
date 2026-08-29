import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CADASTRO_PATH, NAV_ITEMS, type NavItem } from '@/content/landing';
import { track, EVENTS } from '@/lib/analytics';

const linkBase =
  'text-[12px] font-medium uppercase tracking-[0.14em] text-ink py-1.5 border-b border-transparent transition-colors hover:text-rosa hover:border-rosa-light';

function NavEntry({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  if (item.kind === 'disabled') {
    return (
      <span className="cursor-not-allowed py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft opacity-55">
        {item.label}
      </span>
    );
  }
  if (item.kind === 'route') {
    return (
      <Link to={item.href} className={linkBase} onClick={onNavigate}>
        {item.label}
      </Link>
    );
  }
  if (item.kind === 'external') {
    return (
      <a href={item.href} className={linkBase} onClick={onNavigate} target="_blank" rel="noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <a href={item.href} className={linkBase} onClick={onNavigate}>
      {item.label}
    </a>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-[90] border-b border-border bg-[hsl(var(--bege-light)/0.92)] backdrop-blur-md backdrop-saturate-150">
      <div className="relative mx-auto flex h-[72px] max-w-[1280px] items-center justify-center px-5 sm:px-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          className="absolute right-4 top-1/2 z-[95] flex h-9 w-9 -translate-y-1/2 flex-col items-center justify-center gap-[5px] lg:hidden"
        >
          <span className={`block h-[2px] w-[22px] bg-ink transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`block h-[2px] w-[22px] bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-[2px] w-[22px] bg-ink transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>

        {/* Desktop */}
        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavEntry key={item.label} item={item} onNavigate={close} />
          ))}
          <Link
            to={CADASTRO_PATH}
            onClick={() => track(EVENTS.ctaClick, { local: 'nav' })}
            className="whitespace-nowrap rounded-[8px] bg-rosa px-[22px] py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-px hover:bg-rosa/90"
          >
            Seja uma representante
          </Link>
        </nav>

        {/* Mobile */}
        {open && (
          <nav className="absolute left-0 right-0 top-[72px] flex flex-col items-start gap-5 border-b border-border bg-bege-light px-6 pb-8 pt-6 shadow-[0_12px_24px_rgba(35,33,30,0.06)] lg:hidden">
            {NAV_ITEMS.map((item) => (
              <NavEntry key={item.label} item={item} onNavigate={close} />
            ))}
            <Link
              to={CADASTRO_PATH}
              onClick={() => {
                track(EVENTS.ctaClick, { local: 'nav_mobile' });
                close();
              }}
              className="rounded-[8px] bg-rosa px-[22px] py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-white"
            >
              Seja uma representante
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
