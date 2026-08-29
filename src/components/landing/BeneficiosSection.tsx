import { Check } from 'lucide-react';
import { BENEFICIOS, INSTITUCIONAL } from '@/content/landing';
import { wrap } from './styles';

export default function BeneficiosSection() {
  return (
    <section className="border-t border-border py-[48px]">
      {/* Bloco institucional full width */}
      <div className="mb-12 w-full border-b border-border bg-bege-warm px-5 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-[920px] text-center">
          <p className="mb-[18px] font-serif text-[20px] font-medium italic leading-[1.4] text-rosa sm:text-[26px]">
            {INSTITUCIONAL.lead}
          </p>
          <p className="text-base leading-[1.75] text-ink-soft">{INSTITUCIONAL.body}</p>
        </div>
      </div>

      <div className={wrap}>
        <ul className="mx-auto max-w-[680px]">
          {BENEFICIOS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-4 border-b border-border py-5 text-base leading-[1.55] text-ink last:border-b-0"
            >
              <Check size={22} className="mt-0.5 shrink-0 text-rosa" strokeWidth={1.6} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
