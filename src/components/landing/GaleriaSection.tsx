import { useEffect, useState } from 'react';
import { GALERIA_IMAGES, deveRenderizar } from '@/content/landing';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import ImageSlot from './ImageSlot';
import { sectionTitle, wrap } from './styles';

/** Tempo que cada trio de fotos fica parado antes de avançar sozinho. */
const INTERVALO_MS = 4000;

/**
 * Carrossel do mostruário: três fotos por tela, sempre deixando metade da
 * próxima à mostra — a "espiadinha" sinaliza que há mais peças a seguir.
 */
export default function GaleriaSection() {
  const [api, setApi] = useState<CarouselApi>();
  const [pausado, setPausado] = useState(false);

  // Avanço automático. Pausa enquanto a pessoa olha (hover/foco) ou arrasta, e
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
  if (!deveRenderizar(GALERIA_IMAGES)) return null;

  return (
    <section className="bg-bege-warm py-[48px]">
      <div className={wrap}>
        <h2 className={sectionTitle}>
          Peças que conversam
          <br />
          com quem usa
        </h2>

        <Carousel
          opts={{ loop: true, align: 'start' }}
          setApi={setApi}
          aria-label="Galeria de semijoias Monarê"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocusCapture={() => setPausado(true)}
          onBlurCapture={() => setPausado(false)}
        >
          <CarouselContent className="-ml-5">
            {GALERIA_IMAGES.map((image) => (
              // 3,5 slides por tela (100%/3,5): as 3 fotos inteiras + metade da
              // próxima. No celular o trio inteiro esmagaria as fotos, então
              // entram ~2,5 — mantendo a mesma "espiadinha" do próximo.
              <CarouselItem key={image.fileName} className="basis-[40%] pl-5 sm:basis-[calc(100%/3.5)]">
                <ImageSlot image={image} className="aspect-[1/1.1] w-full rounded-[10px]" />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-6 flex items-center justify-center gap-3">
            <CarouselPrevious className="static translate-y-0" aria-label="Fotos anteriores" />
            <CarouselNext className="static translate-y-0" aria-label="Próximas fotos" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
