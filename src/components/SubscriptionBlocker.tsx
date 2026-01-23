import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext'; // <--- Importante
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Crown, Loader2 } from 'lucide-react';

interface SubscriptionBlockerProps {
  children: React.ReactNode;
}

export function SubscriptionBlocker({ children }: SubscriptionBlockerProps) {
  const navigate = useNavigate();
  const { user } = useAuth(); // <--- Pegamos seu usuário
  const { subscription, isLoading, isExpired } = useSubscription();

  // --- REGRA DE OURO VISUAL ---
  // Se for você, renderiza o conteúdo (children) imediatamente.
  // Ignora carregamento, ignora validade, ignora tudo.
  if (user?.email?.trim().toLowerCase() === "erieltondepaulamelo@gmail.com") {
    return <>{children}</>;
  }
  // ----------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Lógica original de bloqueio (só aparece para quem NÃO é você)
  if (!subscription.subscribed || isExpired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription className="text-base">
              {isExpired 
                ? 'Sua assinatura expirou. Renove para continuar acessando.'
                : 'Você precisa de uma assinatura ativa para acessar este recurso.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-left space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Cadastro ilimitado de livros
              </li>
              <li className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Registro completo de leituras
              </li>
              <li className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Avaliações, citações e vocabulário
              </li>
              <li className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Dicionário e progresso da Bíblia
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={() => navigate('/assinatura')}
            >
              <Crown className="h-4 w-4 mr-2" />
              Ver Planos de Assinatura
            </Button>
            <p className="text-xs text-muted-foreground">
              Garantia de 7 dias - cancele e receba reembolso total
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}