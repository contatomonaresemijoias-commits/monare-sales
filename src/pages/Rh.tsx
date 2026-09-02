import { Link } from 'react-router-dom';
import { ArrowLeft, Banknote, BarChart3, ClipboardList, LogOut, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Candidatas from '@/components/rh/Candidatas';
import CandidatasRelatorio from '@/components/rh/CandidatasRelatorio';
import Equipe from '@/components/rh/Equipe';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_PATH } from '@/lib/acesso';
import { PAINEL_PATH } from '@/content/landing';

const tabTriggerClass =
  'flex-col sm:flex-row gap-0.5 sm:gap-0 h-auto py-2 text-[11px] sm:text-sm data-[state=active]:bg-rosa data-[state=active]:text-white';

/**
 * Painel de RH — o ciclo de vida das pessoas, separado da operação comercial.
 *
 * Captação → contratação → ativação/inativação. Estoque, vendas, produtos e
 * comissão continuam no /admin: quem é de RH não precisa deles e não os vê.
 */
export default function Rh() {
  const { isAdmin, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-monare-gradient pb-12">
      <header className="px-4 sm:px-5 py-5 sm:py-6 max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link
          to={isAdmin ? ADMIN_PATH : PAINEL_PATH}
          className="inline-flex items-center gap-2 text-ink-soft hover:text-rosa text-sm transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
          {isAdmin ? 'Painel Admin' : 'Voltar'}
        </Link>

        <div className="text-center">
          <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.15em] text-ink uppercase">Monarê</h1>
          <p className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">
            Recursos Humanos
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              to={ADMIN_PATH}
              className="inline-flex items-center gap-1.5 text-ink-soft hover:text-rosa text-xs transition-colors"
              title="Painel comercial"
            >
              <Banknote size={14} />
              <span>Comercial</span>
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 text-ink-soft hover:text-rosa text-xs transition-colors"
            aria-label="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-5">
        <Tabs defaultValue="captacao" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-white/70 border border-bege p-1">
            <TabsTrigger value="captacao" className={tabTriggerClass}>
              <ClipboardList size={14} className="sm:mr-1.5" />
              Captação
            </TabsTrigger>
            <TabsTrigger value="equipe" className={tabTriggerClass}>
              <Users size={14} className="sm:mr-1.5" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="relatorio" className={tabTriggerClass}>
              <BarChart3 size={14} className="sm:mr-1.5" />
              Relatório
            </TabsTrigger>
          </TabsList>

          <TabsContent value="captacao" className="mt-6">
            <Candidatas />
          </TabsContent>
          <TabsContent value="equipe" className="mt-6">
            <Equipe />
          </TabsContent>
          <TabsContent value="relatorio" className="mt-6">
            <CandidatasRelatorio />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
