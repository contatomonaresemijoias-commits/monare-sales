import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { rotaInicial, type Papel } from '@/lib/acesso';

export default function RequireAuth({
  children,
  papeis,
}: {
  children: JSX.Element;
  /**
   * Papéis que abrem esta rota. Sem a prop, basta estar autenticada e ativa
   * (é o caso do painel da revendedora).
   */
  papeis?: Papel[];
}) {
  const { user, roles, loading, isAtivo, signOut } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-monare-gradient">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: loc }} />;

  // Conta desativada pela administração: nenhuma rota protegida abre.
  // O bloqueio de verdade é o RLS + o ban no Auth; esta tela é o aviso.
  if (!isAtivo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-monare-gradient p-6">
        <div className="bg-white rounded-2xl border border-bege p-8 max-w-sm w-full text-center shadow-xl">
          <ShieldOff className="mx-auto text-rosa mb-3" size={32} />
          <h1 className="font-serif text-2xl text-ink mb-2">Acesso desativado</h1>
          <p className="text-sm text-ink-soft mb-6">
            Sua conta foi desativada pela administração da Monarê. Fale com a equipe para
            reativá-la.
          </p>
          <Button onClick={signOut} className="w-full bg-rosa hover:bg-rosa/90 text-white">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  // Papel errado não é erro: manda para o painel que a pessoa de fato usa,
  // em vez de deixá-la num 403 sem saída.
  if (papeis && !papeis.some((p) => roles.includes(p))) {
    return <Navigate to={rotaInicial(roles)} replace />;
  }

  return children;
}
