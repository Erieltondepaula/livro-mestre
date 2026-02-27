import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isMaster, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Master users bypass is_active check
  if (profile && !profile.is_active && !isMaster) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold text-destructive mb-2">Conta Desativada</h2>
          <p className="text-muted-foreground">
            Sua conta foi desativada pelo administrador. Entre em contato para mais informações.
          </p>
        </div>
      </div>
    );
  }

  // Master users bypass admin requirement
  if (requireAdmin && !isAdmin && !isMaster) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}