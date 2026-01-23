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

  // SEU E-MAIL MESTRE
  const MASTER_EMAIL = "erieltondepaulamelo@gmail.com";

  const checkSubscription = useCallback(async () => {
    if (!session || !user) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    // --- CORREÇÃO: REGRA MESTRA À PROVA DE FALHAS ---
    // Converte tudo para minúsculo para garantir que funcione sempre
    const userEmail = user.email?.toLowerCase().trim();
    const masterEmail = MASTER_EMAIL.toLowerCase().trim();

    if (userEmail === masterEmail) {
      console.log("👑 Acesso Mestre Vitalício CONFIRMADO para:", userEmail);
      
      setSubscription({
        subscribed: true,
        productId: 'master_plan_unlimited', 
        priceId: 'price_master',
        subscriptionEnd: '2099-12-31T23:59:59.999Z',
        subscriptionStart: new Date().toISOString(),
        cancelAtPeriodEnd: false,
        daysUntilExpiry: 36500, 
        isWithinRefundPeriod: false,
      });
      
      setIsLoading(false);
      return; // Sai da função aqui, garantindo o acesso
    }
    // --------------------------------------------------

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

  // Atualiza a cada minuto
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