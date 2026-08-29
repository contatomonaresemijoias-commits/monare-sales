import { useEffect, useState } from 'react';
import { DEPOIMENTOS, deveRenderizar } from '@/content/landing';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import ImageSlot from './ImageSlot';
import { card, sectionTitle, wrap } from './styles';

/** Tempo que cada avaliação fica parada antes de avançar sozinha. */
const INTERVALO_MS = 5000;

export default function DepoimentosSection() {
  const [api, setApi] = useState<CarouselApi>();
  const [pausado, setPausado] = useState(false);

  // Avanço automático. Pausa enquanto a pessoa lê (hover/foco) ou arrasta, e
  // não roda para quem pediu menos movimento no sistema.
  useEffect(() => {
    if (!api || pausado) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => api.scrollNext(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [api, pausado]);

  useEffect(() => {
    if (!api) return;

    const pausa = () => setPausado(true);
    api.on('pointerDown', pausa);
    return () => {
      api.off('pointerDown', pausa);
    };
  }, [api]);

  // Seção 100% visual: sem nenhuma foto ela não vai pro ar.
  if (!deveRenderizar(DEPOIMENTOS)) return null;

  return (
    <section className="py-[72px]">
      <div className={wrap}>
        <h2 className={sectionTitle}>O que falam sobre nós?</h2>

        <Carousel
          opts={{ loop: true, align: 'start' }}
          setApi={setApi}
          aria-label="Avaliações de revendedoras"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocusCapture={() => setPausado(true)}
          onBlurCapture={() => setPausado(false)}
        >
          <CarouselContent className="-ml-5 py-1">
            {DEPOIMENTOS.map((depoimento) => (
              <CarouselItem key={depoimento.fileName} className="basis-[280px] pl-5 md:basis-1/3">
                <div className={`${card} overflow-hidden shadow-[0_4px_12px_rgba(35,33,30,0.03)]`}>
                  {/* Prints são 1000x800 (5:4): a proporção fixa mostra o texto inteiro, sem corte. */}
                  <ImageSlot image={depoimento} className="aspect-[5/4] w-full" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-8 flex items-center justify-center gap-3">
            <CarouselPrevious className="static translate-y-0" aria-label="Avaliação anterior" />
            <CarouselNext className="static translate-y-0" aria-label="Próxima avaliação" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
