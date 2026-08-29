import { Link } from 'react-router-dom';
import { CADASTRO_PATH, PRAZO_RETORNO, REVENDEDORAS_ATIVAS } from '@/content/landing';
import { track, EVENTS } from '@/lib/analytics';
import { btnPrimary, sectionTitle, wrap } from './styles';

export default function CtaSection() {
  const chamada =
    REVENDEDORAS_ATIVAS === null
      ? 'Junte-se às mulheres que já transformaram suas vidas com a Monarê.'
      : `Junte-se a mais de ${REVENDEDORAS_ATIVAS} mulheres que já transformaram suas vidas.`;

  return (
    <section className="py-[36px]">
      <div className={`${wrap} text-center`}>
        <h2 className={sectionTitle}>Pronta para começar?</h2>
        <p className="mb-7 text-[15px] text-ink-soft">
          {chamada}
          <br />
          Retornamos pelo WhatsApp em {PRAZO_RETORNO}.
        </p>
        <Link
          to={CADASTRO_PATH}
          className={btnPrimary}
          onClick={() => track(EVENTS.ctaClick, { local: 'final' })}
        >
          Quero ser uma representante
        </Link>
      </div>
    </section>
  );
}
