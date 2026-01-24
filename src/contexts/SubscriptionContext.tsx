import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  subscriptionStart: string | null;
  cancelAtPeriodEnd: boolean;
  daysUntilExpiry: number | null;
  isWithinRefundPeriod: boolean;
  isMasterUser: boolean; // Flag para identificar mestre
  isFreePlan: boolean;   // Flag para plano gratuito (limite de 3 livros)
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

const defaultSubscription: SubscriptionStatus = {
  subscribed: false,
  productId: null,
  priceId: null,
  subscriptionEnd: null,
  subscriptionStart: null,
  cancelAtPeriodEnd: false,
  daysUntilExpiry: null,
  isWithinRefundPeriod: false,
  isMasterUser: false,
  isFreePlan: true, // Por padrão, usuários não assinantes estão no plano gratuito
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);

  const MASTER_EMAIL = "erieltondepaulamelo@gmail.com";

  const checkSubscription = useCallback(async () => {
    if (!session || !user) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    // 1. REGRA MESTRA (Modo Deus) - ACESSO VITALÍCIO GARANTIDO
    const userEmail = user.email?.toLowerCase().trim();
    if (userEmail === MASTER_EMAIL) {
      console.log("👑 Modo Deus Ativado - Acesso Vitalício");
      setSubscription({
        subscribed: true,
        productId: 'master_plan_unlimited',
        priceId: 'price_master',
        subscriptionEnd: '2100-12-31T23:59:00Z',
        subscriptionStart: new Date().toISOString(),
        cancelAtPeriodEnd: false,
        daysUntilExpiry: 36500,
        isWithinRefundPeriod: false,
        isMasterUser: true,
        isFreePlan: false, // Mestre nunca está no plano gratuito
      });
      setIsLoading(false);
      return; 
    }

    try {
      setIsLoading(true);

      // 2. VERIFICAÇÃO DO BANCO DE DADOS (Prioridade sobre o Stripe)
      // Aqui verificamos se existe uma "cortesia" ou assinatura manual
      const { data: localSub, error: localError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!localError && localSub && (localSub.status === 'active' || localSub.status === 'trialing')) {
        // Se achou no banco, USA O BANCO! (Ignora o Edge Function/Stripe)
        console.log("✅ Assinatura local encontrada:", localSub);
        
        const subscriptionEnd = localSub.current_period_end ? new Date(localSub.current_period_end) : null;
        const subscriptionStart = localSub.created_at ? new Date(localSub.created_at) : null;
        const now = new Date();
        
        let daysUntilExpiry: number | null = null;
        if (subscriptionEnd) {
          daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Se a data já expirou, bloqueia (mesmo estando 'active' no banco)
        if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
           console.log("❌ Assinatura local expirada.");
           setSubscription({
             ...defaultSubscription,
             isMasterUser: false,
             isFreePlan: true,
           });
        } else {
           setSubscription({
            subscribed: true,
            productId: localSub.plan_type || 'pro', // Assume PRO se não tiver
            priceId: 'manual_override',
            subscriptionEnd: localSub.current_period_end,
            subscriptionStart: localSub.created_at,
            cancelAtPeriodEnd: false,
            daysUntilExpiry,
            isWithinRefundPeriod: false,
            isMasterUser: false,
            isFreePlan: false, // Tem assinatura ativa, não está no plano gratuito
          });
        }
        
        setIsLoading(false);
        return; // <--- O PULO DO GATO: Sai da função aqui, nem chama o Stripe.
      }

      // 3. SE NÃO ACHOU NO BANCO, PERGUNTA PRO STRIPE (Fallback)
      console.log("⚠️ Nada no banco local, verificando Stripe...");
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(defaultSubscription);
        return;
      }

      const subscriptionEnd = data?.subscription_end ? new Date(data.subscription_end) : null;
      const subscriptionStart = data?.subscription_start ? new Date(data.subscription_start) : null;
      const now = new Date();
      
      let daysUntilExpiry: number | null = null;
      if (subscriptionEnd) {
        daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      let isWithinRefundPeriod = false;
      if (subscriptionStart) {
        const daysSinceStart = Math.floor((now.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24));
        isWithinRefundPeriod = daysSinceStart <= 7;
      }

      setSubscription({
        subscribed: data?.subscribed || false,
        productId: data?.product_id || null,
        priceId: data?.price_id || null,
        subscriptionEnd: data?.subscription_end || null,
        subscriptionStart: data?.subscription_start || null,
        cancelAtPeriodEnd: data?.cancel_at_period_end || false,
        daysUntilExpiry,
        isWithinRefundPeriod,
        isMasterUser: false,
        isFreePlan: !(data?.subscribed), // Se não tem assinatura Stripe, está no plano gratuito
      });

    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(defaultSubscription);
    } finally {
      setIsLoading(false);
    }
  }, [session, user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Checa a cada minuto
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => checkSubscription(), 60000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const isExpiringSoon = subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 7 && subscription.daysUntilExpiry > 0;
  const isExpired = subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 0;

  return (
    <SubscriptionContext.Provider 
      value={{ subscription, isLoading, checkSubscription, isExpiringSoon, isExpired }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}