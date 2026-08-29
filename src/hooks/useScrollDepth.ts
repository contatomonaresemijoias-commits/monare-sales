import { useEffect, useRef } from 'react';
import { track, EVENTS } from '@/lib/analytics';

const MARCOS = [25, 50, 75, 100];

/** Dispara um evento por marco de rolagem alcançado (uma vez por visita). */
export default function useScrollDepth(pagina: string) {
  const disparados = useRef<Set<number>>(new Set());

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return;
      const percentual = (el.scrollTop / total) * 100;

      for (const marco of MARCOS) {
        if (percentual >= marco && !disparados.current.has(marco)) {
          disparados.current.add(marco);
          track(EVENTS.landingScroll, { pagina, profundidade: marco });
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pagina]);
}
