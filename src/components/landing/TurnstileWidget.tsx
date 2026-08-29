import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, RotateCcw } from 'lucide-react';
import { TURNSTILE_SCRIPT_URL, TURNSTILE_SITE_KEY, turnstileAtivo } from '@/lib/turnstile';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string | undefined;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** O script é único na página, mesmo que o componente monte e desmonte. */
let scriptPromise: Promise<void> | null = null;

function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve() : reject(new Error('turnstile não inicializou')));
    script.onerror = () => {
      // Zera para que uma nova tentativa possa recarregar o script.
      scriptPromise = null;
      reject(new Error('script do turnstile indisponível'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type Props = {
  /** Recebe o token a cada emissão, e `null` quando ele expira ou é resetado. */
  onToken: (token: string | null) => void;
  /**
   * Trocar este valor força um widget novo. O token do Turnstile é de uso
   * único: se o `start` falhar depois de consumi-lo, a retentativa precisa de
   * um token fresco, senão a candidata trava num loop de erro.
   */
  resetKey?: number;
};

/**
 * Widget do Turnstile em modo `interaction-only`: na maioria dos casos resolve
 * sozinho e a candidata não clica em nada. Só aparece desafio quando o sinal é
 * ruim — o que importa num funil de 5 etapas, onde cada clique extra custa
 * conversão.
 */
export default function TurnstileWidget({ onToken, resetKey = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  // Mantém o callback fresco sem re-montar o widget a cada render do formulário.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileAtivo()) return;

    let cancelado = false;
    setEstado('carregando');
    onTokenRef.current(null);

    carregarScript()
      .then(() => {
        if (cancelado || !hostRef.current || !window.turnstile) return;
        hostRef.current.innerHTML = '';
        const id = window.turnstile.render(hostRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          'refresh-expired': 'auto',
          size: 'flexible',
          language: 'pt-br',
          callback: (token: string) => {
            if (cancelado) return;
            setEstado('pronto');
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            if (cancelado) return;
            setEstado('carregando');
            onTokenRef.current(null);
          },
          'error-callback': () => {
            if (cancelado) return;
            setEstado('erro');
            onTokenRef.current(null);
          },
        });
        widgetIdRef.current = id ?? null;
      })
      .catch(() => {
        if (!cancelado) setEstado('erro');
      });

    return () => {
      cancelado = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget já removido junto com o nó: nada a fazer.
        }
      }
      widgetIdRef.current = null;
    };
  }, [resetKey]);

  if (!turnstileAtivo()) return null;

  return (
    <div className="rounded-2xl border border-border bg-white/60 px-3 py-2.5">
      <div ref={hostRef} className="empty:hidden mb-1.5" />
      {estado === 'carregando' && (
        <p className="flex items-center gap-2 text-[11px] text-ink-soft">
          <Loader2 size={12} className="animate-spin text-rosa" />
          Verificando que você é uma pessoa…
        </p>
      )}
      {estado === 'pronto' && (
        <p className="flex items-center gap-2 text-[11px] text-ink-soft">
          <ShieldCheck size={12} className="text-rosa" />
          Verificação concluída.
        </p>
      )}
      {estado === 'erro' && (
        <p className="flex items-center gap-2 text-[11px] text-ink-soft">
          <RotateCcw size={12} className="text-rosa" />
          Não foi possível concluir a verificação. Confira sua conexão e recarregue a página.
        </p>
      )}
    </div>
  );
}
