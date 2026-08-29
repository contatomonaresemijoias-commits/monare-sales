import { SOBRE } from '@/content/landing';
import { card, sectionTitle, wrap } from './styles';

export default function SobreSection() {
  return (
    <section id="sobre" className="scroll-mt-[72px] border-t border-border py-[48px]">
      <div className={wrap}>
        <h2 className={sectionTitle}>Sobre nós</h2>

        <div className="mx-auto max-w-[820px] text-center">
          <p className="mb-7 font-serif text-[20px] font-medium italic leading-[1.4] text-rosa sm:text-[26px]">
            {SOBRE.lead}
          </p>
          {SOBRE.paragrafos.map((paragrafo) => (
            <p key={paragrafo} className="mb-5 text-base leading-[1.75] text-ink-soft last:mb-0">
              {paragrafo}
            </p>
          ))}
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SOBRE.pilares.map(({ icon: Icon, title, text }) => (
            <div key={title} className={`${card} px-7 py-9 text-center`}>
              <Icon size={40} strokeWidth={1.3} className="mx-auto mb-4 block text-rosa" />
              <h3 className="mb-2.5 font-serif text-[21px] font-semibold text-ink">{title}</h3>
              {/* Corpo em ink-soft para manter o contraste AA neste tamanho. */}
              <p className="text-[14.5px] leading-[1.6] text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
