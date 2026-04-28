import { Link } from 'react-router-dom';
import { LogOut, Settings, Crown } from 'lucide-react';
import SaleRegistrationForm from '@/components/SaleRegistrationForm';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { signOut, isAdmin, user } = useAuth();
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

      {isAdmin && (
        <div className="pt-20 px-5 flex justify-center">
          <Link
            to="/admin"
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] text-[#f5d28a] text-sm font-bold tracking-[0.2em] uppercase shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border-2 border-[#d4af6a]/60 hover:border-[#f5d28a] hover:shadow-[0_15px_50px_-10px_rgba(212,175,106,0.6)] active:scale-[0.98] transition-all"
          >
            <Crown size={18} className="text-[#f5d28a] group-hover:scale-110 transition-transform" />
            Acessar Painel Monarê
            <Crown size={18} className="text-[#f5d28a] group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      )}

      <SaleRegistrationForm />
    </main>
  );
};

export default Index;
