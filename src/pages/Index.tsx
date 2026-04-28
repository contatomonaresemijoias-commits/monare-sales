import { Link } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
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
              Admin
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
      <SaleRegistrationForm />
    </main>
  );
};

export default Index;
