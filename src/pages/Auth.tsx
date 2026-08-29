import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { whatsappLink } from '@/lib/monare';
import usePageMeta from '@/hooks/usePageMeta';
import { rotaInicial } from '@/lib/acesso';

export default function AuthPage() {
  const { user, loading, roles } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({ title: 'Acesso da consultora — Monarê', noIndex: true });

  // Uma tela de login para todo mundo; o papel é que decide o destino:
  // administrador → /admin, rh → /rh, revendedora e B2B → /painel.
  const destino = rotaInicial(roles);

  useEffect(() => {
    if (!loading && user) nav(destino, { replace: true });
  }, [user, loading, destino, nav]);

  if (!loading && user) return <Navigate to={destino} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      const raw = err?.message ?? 'Erro ao autenticar';
      const map: Record<string, string> = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed': 'E-mail ainda não confirmado.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
      };
      // Conta desativada pela admin é banida no Auth; a mensagem do GoTrue
      // varia ("User is banned" / "user_banned"), então casa por trecho.
      const banida = /banned/i.test(raw);
      const friendly = banida
        ? 'Esta conta está desativada. Fale com a administração da Monarê.'
        : map[raw] ?? 'Erro inesperado. Tente novamente.';
      setError(friendly);
      console.error('[Auth]', err);
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    'w-full rounded-2xl px-5 py-4 text-ink text-base outline-none transition-all duration-200 border border-border bg-white/80 placeholder:text-ink-soft/40 focus:border-rosa focus:ring-2 focus:ring-rosa/20';
  const labelBase = 'block text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft mb-2';

  return (
    <main className="min-h-screen bg-monare-gradient flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-rosa/40" />
            <ShieldCheck size={12} className="text-rosa" />
            <span className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">Área Restrita</span>
            <ShieldCheck size={12} className="text-rosa" />
            <div className="h-px w-8 bg-rosa/40" />
          </div>
          <h1 className="font-serif text-5xl tracking-[0.15em] font-light text-ink uppercase">Monarê</h1>
          <p className="text-ink-soft text-xs tracking-[0.25em] uppercase mt-2">
            Entrar
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-luxe overflow-hidden border border-white/60">
          <div className="h-1.5 w-full accent-bar" />
          <form onSubmit={submit} className="p-6 space-y-5">
            <div>
              <label className={labelBase}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                className={inputBase}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelBase}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputBase}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-rosa-gradient text-white text-sm font-semibold tracking-[0.1em] uppercase shadow-rosa active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>

            <p className="text-xs text-ink-soft text-center">
              Esqueceu sua senha? Entre em contato com o administrador.
            </p>

            <a
              href={whatsappLink(
                'Olá, tudo bom? Eu acessei o site de vocês Monarê e gostaria de me tornar uma revendedora de vocês.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 rounded-2xl border border-rosa text-rosa text-xs font-semibold hover:bg-rosa/5 transition-colors"
            >
              Quer ser revendedora? Fale conosco pelo WhatsApp
            </a>
          </form>
        </div>
      </div>
    </main>
  );
}
