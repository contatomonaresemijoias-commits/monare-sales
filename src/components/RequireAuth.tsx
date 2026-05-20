import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: JSX.Element;
  adminOnly?: boolean;
}) {
  const { user, loading, isAdmin } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-monare-gradient">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: loc }} />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}
