import { useState } from 'react';
import { FAQ } from '@/content/landing';
import { track, EVENTS } from '@/lib/analytics';
import { sectionTitle, wrap } from './styles';

export default function FaqSection() {
  const [aberta, setAberta] = useState<number | null>(null);

  function alternar(indice: number, pergunta: string) {
    const abrindo = aberta !== indice;
    setAberta(abrindo ? indice : null);
    if (abrindo) track(EVENTS.faqOpen, { pergunta });
  }

  return (
    <section id="faq" className="scroll-mt-[72px] border-t border-border py-[72px]">
      <div className={wrap}>
        <h2 className={sectionTitle}>Dúvidas frequentes</h2>

        <div className="mx-auto max-w-[680px]">
          {FAQ.map(({ q, a }, i) => {
            const aberto = aberta === i;
            return (
              <div key={q} className="border-b border-border first:border-t">
                <button
                  type="button"
                  onClick={() => alternar(i, q)}
                  aria-expanded={aberto}
                  className="flex w-full select-none items-center justify-between gap-5 px-1 py-[22px] text-left text-base font-medium text-ink"
                >
                  <span className="leading-[1.5]">{q}</span>
                  <span
                    className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-rosa-light text-[15px] leading-none transition-colors ${
                      aberto ? 'bg-rosa text-white' : 'text-rosa'
                    }`}
                  >
                    {aberto ? '−' : '+'}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
                    aberto ? 'max-h-[400px]' : 'max-h-0'
                  }`}
                >
                  <p className="pb-[22px] pl-1 pr-[30px] text-[14.5px] leading-[1.65] text-ink-soft">{a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
