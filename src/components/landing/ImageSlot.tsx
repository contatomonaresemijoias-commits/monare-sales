import type { LandingImage } from '@/content/landing';

type Props = {
  image: LandingImage;
  /** Classes de tamanho/proporção aplicadas ao contêiner (vale para foto e placeholder). */
  className?: string;
  /** `eager` só para imagens acima da dobra (hero). */
  loading?: 'lazy' | 'eager';
};

/**
 * Reserva o espaço de uma foto da landing. Enquanto `image.src` for null,
 * desenha um placeholder com o caminho de arquivo esperado — o layout já fica
 * na proporção final, então plugar a foto depois não mexe no design.
 */
export default function ImageSlot({ image, className = '', loading = 'lazy' }: Props) {
  if (image.src) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img src={image.src} alt={image.alt} loading={loading} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden ${className}`}
      role="img"
      aria-label={`Espaço reservado: ${image.alt}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 border border-dashed border-rosa-light bg-bege-warm px-6 py-6 text-center text-xs leading-relaxed text-ink-soft">
        <span>{image.hint}</span>
        <span className="rounded-[2px] border border-border bg-white px-2 py-0.5 font-mono text-[11px]">
          {image.fileName}
        </span>
      </div>
    </div>
  );
}
