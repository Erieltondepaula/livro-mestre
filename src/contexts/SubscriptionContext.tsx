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
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);

  // --- CONFIGURAÇÃO DO USUÁRIO MESTRE (VOCÊ) ---
  const MASTER_EMAIL = "erieltondepaulamelo@gmail.com";

  const checkSubscription = useCallback(async () => {
    if (!session || !user) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    // --- REGRA DE OURO: SE FOR O DONO, LIBERA TUDO AQUI ---
    // Isso acontece ANTES de tentar conectar no banco de dados.
    // Assim, mesmo se o banco falhar, você entra.
    const userEmail = user.email?.toLowerCase().trim();
    if (userEmail === MASTER_EMAIL) {
      console.log("👑 Usuário Mestre Identificado. Liberando acesso total.");
      setSubscription({
        subscribed: true,
        productId: 'master_plan_unlimited',
        priceId: 'price_master_key',
        subscriptionEnd: '2099-12-31T23:59:59.999Z', // Data longínqua
        subscriptionStart: new Date().toISOString(),
        cancelAtPeriodEnd: false,
        daysUntilExpiry: 36500, // 100 anos
        isWithinRefundPeriod: false,
      });
      setIsLoading(false);
      return; // <--- O segredo é este return: ele para a função aqui para você.
    }
    // -----------------------------------------------------

    // DAQUI PARA BAIXO É O CÓDIGO ORIGINAL PARA OS OUTROS USUÁRIOS
    try {
      setIsLoading(true);
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

      // Check if within 7-day refund period (Brazilian consumer law)
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

  // Auto-refresh subscription status every minute
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      checkSubscription();
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const isExpiringSoon = subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 7 && subscription.daysUntilExpiry > 0;
  const isExpired = subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 0;

  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscription, 
        isLoading, 
        checkSubscription,
        isExpiringSoon,
        isExpired,
      }}
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