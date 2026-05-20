import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import SaleRegistrationForm from '@/components/SaleRegistrationForm';
import EstoqueSidebar from '@/components/EstoqueSidebar';
import Dashboard from '@/components/Dashboard';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { signOut, isAdmin, isRevendedora, isB2B, user } = useAuth();
  const [selectedSku, setSelectedSku] = useState<string | undefined>();

  const showDashboard = isRevendedora || isB2B || isAdmin;

  return (
    <main className="min-h-screen bg-monare-gradient relative">
      {user && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 hover:bg-white text-ink text-[11px] uppercase tracking-wider font-semibold border border-bege transition-all"
            >
              <Settings size={13} />
              Painel Admin
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/80 hover:bg-white text-ink-soft hover:text-rosa text-[11px] uppercase tracking-wider font-semibold border border-bege transition-all"
            aria-label="Sair"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center px-4 pt-16 pb-10 min-h-screen">
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.35em] text-[#9B8E7E] uppercase mb-2">
            Monarê Semijoias
          </p>
          <h1 className="text-2xl font-light text-[#2C2825] tracking-widest uppercase">
            Registro de Venda
          </h1>
          <div className="mt-4 mx-auto w-10 h-px bg-[#C9A96E]" />
        </div>

        <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full">
          <EstoqueSidebar
            onSelectSku={setSelectedSku}
            selectedSku={selectedSku}
          />
          <div className="w-full max-w-md">
            <SaleRegistrationForm
              externalSku={selectedSku}
              onSkuConsumed={() => setSelectedSku(undefined)}
            />
          </div>
          {showDashboard && <Dashboard />}
        </div>
      </div>
    </main>
  );
};

export default Index;
