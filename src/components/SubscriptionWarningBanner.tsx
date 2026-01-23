import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useState } from 'react';

export function SubscriptionWarningBanner() {
  const navigate = useNavigate();
  const { subscription, isExpiringSoon, isExpired } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if dismissed, not subscribed, or not expiring
  if (isDismissed || !subscription.subscribed) return null;
  if (!isExpiringSoon && !isExpired) return null;

  const daysLeft = subscription.daysUntilExpiry || 0;

  if (isExpired) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3">
        <div className="container flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Sua assinatura expirou. Renove agora para continuar usando o sistema.
            </p>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => navigate('/assinatura')}
          >
            Renovar Agora
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-3">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {daysLeft === 1 
              ? 'Sua assinatura vence amanhã!' 
              : `Sua assinatura vence em ${daysLeft} dias.`
            }
            {subscription.cancelAtPeriodEnd 
              ? ' A renovação automática está desativada.' 
              : ' Será renovada automaticamente.'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => navigate('/assinatura')}
          >
            Ver Detalhes
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-amber-950 hover:bg-amber-600"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
