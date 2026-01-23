import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, profile } = useAuth();

  // --- REGRA MESTRA: IDENTIFICAÇÃO DO DONO ---
  // Verifica se é o seu email (convertendo para minúsculo para evitar erros)
  const isMaster = user?.email?.toLowerCase().trim() === "erieltondepaulamelo@gmail.com";

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

  // Verifica se a conta está ativa. 
  // ADIÇÃO: Se for 'isMaster', ignoramos o bloqueio (!profile.is_active)
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

  // Verifica permissão de Admin.
  // ADIÇÃO: Se for 'isMaster', você passa mesmo sem ser admin no banco.
  if (requireAdmin && !isAdmin && !isMaster) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}