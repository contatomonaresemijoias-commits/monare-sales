import { DIFERENCIAIS } from '@/content/landing';
import { card, wrap } from './styles';

export default function DiferenciaisSection() {
  return (
    <section id="beneficios" className="scroll-mt-[72px] bg-bege-warm py-[48px]">
      <div className={wrap}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {DIFERENCIAIS.map(({ icon: Icon, title, text }) => (
            <div key={title} className={`${card} px-2 py-3 text-center transition-transform hover:-translate-y-0.5`}>
              <Icon size={22} strokeWidth={1.3} className="mx-auto mb-5 block text-rosa" />
              <h3 className="mb-3 font-serif text-[18px] font-bold tracking-[0.01em] text-rosa">{title}</h3>
              {/* Corpo em ink-soft: rosa sobre bege não passa no contraste AA neste tamanho. */}
              <p className="text-[13px] leading-[1.6] text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
