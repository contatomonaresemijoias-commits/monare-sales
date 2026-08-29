import { ROADMAP } from '@/content/landing';
import { sectionTitle, wrap } from './styles';

export default function ComoFuncionaSection() {
  return (
    <section className="border-t border-border py-[20px]">
      <div className={wrap}>
        <h2 className={sectionTitle}>Como funciona?</h2>

        <div className="mt-8 flex flex-col items-center gap-10">
          {/* Timeline dos passos */}
          <div className="relative w-full max-w-[760px]">
            {/* Trilha: à esquerda no mobile, centralizada no desktop */}
            <div className="absolute bottom-0 left-5 top-0 border-l-2 border-dashed border-border md:left-1/2 md:-translate-x-1/2" />

            {ROADMAP.map(({ badge, title, text }, i) => {
              const alinhadoEsquerda = i % 2 === 0;
              return (
                <div
                  key={badge}
                  className={`relative mb-4 w-full py-2.5 pl-12 pr-2.5 text-left last:mb-0 md:mb-0 md:w-1/2 md:px-10 ${alinhadoEsquerda ? 'md:text-right' : 'md:left-1/2'
                    }`}
                >
                  <span
                    className={`absolute left-[15px] top-[17px] h-3 w-3 rounded-full border-[3px] border-bege-light bg-rosa-light ring-2 ring-rosa ${alinhadoEsquerda ? 'md:left-auto md:-right-1.5' : 'md:-left-1.5'
                      }`}
                  />
                  <span className="mb-3 inline-block rounded-[4px] bg-bege-warm px-3.5 py-[5px] text-[11px] font-semibold uppercase tracking-[0.12em] text-rosa">
                    {badge}
                  </span>
                  <h4 className="mb-2 font-serif text-[22px] font-semibold text-ink">{title}</h4>
                  <p className="text-[14.5px] leading-[1.6] text-ink-soft">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

