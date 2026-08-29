import { Link } from 'react-router-dom';
import { CADASTRO_PATH, HERO_IMAGE, deveRenderizar } from '@/content/landing';
import { track, EVENTS } from '@/lib/analytics';
import ImageSlot from './ImageSlot';
import { btnPrimary, wrap } from './styles';

export default function HeroSection() {
  // Sem a foto (e fora de dev) o hero vira uma coluna só, centralizado.
  const comImagem = deveRenderizar([HERO_IMAGE]);

  return (
    <div className={`${wrap} scroll-mt-[72px]`} id="home">
      <header
        className={`grid grid-cols-1 items-center gap-10 pb-[60px] pt-20 md:gap-[60px] md:pb-20 md:pt-[100px] ${
          comImagem ? 'md:grid-cols-[1.2fr_1fr]' : 'mx-auto max-w-[720px]'
        }`}
      >
        <div className={comImagem ? 'text-center md:text-left' : 'text-center'}>
          <span className="mb-2.5 block font-serif text-[38px] font-normal uppercase leading-none tracking-[0.15em] text-rosa sm:text-[52px]">
            Monarê
          </span>
          <span className="mb-6 block text-[11px] uppercase tracking-[0.35em] text-ink-soft">Semijoias</span>

          <h1 className="mb-6 font-serif text-[36px] font-medium leading-[1.15] text-ink sm:text-[54px]">
            Transforme seu
            <br />
            círculo social em
            <br />
            <em className="italic text-rosa">uma oportunidade</em>
          </h1>

          <p
            className={`mb-10 max-w-[540px] text-base leading-[1.7] text-ink-soft ${
              comImagem ? 'mx-auto md:mx-0' : 'mx-auto'
            }`}
          >
            Mesmo sem experiência. Na Monarê, você recebe uma seleção de semijoias para vender e paga apenas pelo que
            comercializar — sem risco, com toda a elegância da marca ao seu favor.
          </p>

          <Link
            to={CADASTRO_PATH}
            className={btnPrimary}
            onClick={() => track(EVENTS.ctaClick, { local: 'hero' })}
          >
            Quero ser uma representante
          </Link>
        </div>

        {comImagem && (
          <ImageSlot image={HERO_IMAGE} loading="eager" className="h-[380px] w-full rounded-[10px] md:h-[460px]" />
        )}
      </header>
    </div>
  );
}
