import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Crown, Sparkles, Loader2, CreditCard, RefreshCw } from 'lucide-react';

// Stripe products/prices
const SUBSCRIPTION_TIERS = {
  monthly: {
    name: 'Plano Mensal',
    price: 'R$ 19,90',
    priceValue: 19.90,
    interval: 'mês',
    priceId: 'price_1SsoXO2Kh3hjNIXReiRPwbpf',
    productId: 'prod_TqVYSLhjDS3VKO',
    features: [
      'Acesso a todos os módulos',
      'Cadastro ilimitado de livros',
      'Registro de leituras',
      'Sistema de avaliações',
      'Citações e vocabulário',
      'Progresso da Bíblia',
      'Dicionário integrado',
    ],
  },
  yearly: {
    name: 'Plano Anual',
    price: 'R$ 199,00',
    priceValue: 199.00,
    interval: 'ano',
    priceId: 'price_1SsoXh2Kh3hjNIXRSwY1C6p2',
    productId: 'prod_TqVYgE6rQklg4J',
    popular: true,
    savings: 'Economize R$ 39,80',
    features: [
      'Todos os recursos do plano mensal',
      'Economia de 2 meses',
      'Acesso prioritário a novidades',
      'Suporte prioritário',
    ],
  },
};

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  price_id: string | null;
  subscription_end: string | null;
}

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const checkSubscription = async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Assinatura realizada com sucesso!',
        description: 'Bem-vindo ao plano premium. Aproveite todos os recursos!',
      });
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast({
        title: 'Assinatura cancelada',
        description: 'Você pode assinar a qualquer momento.',
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const handleCheckout = async (priceId: string) => {
    if (!session) {
      toast({
        title: 'Faça login primeiro',
        description: 'Você precisa estar logado para assinar.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      setIsCheckingOut(priceId);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro ao iniciar checkout',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Erro ao abrir gerenciamento',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTier = () => {
    if (!subscriptionStatus?.product_id) return null;
    
    if (subscriptionStatus.product_id === SUBSCRIPTION_TIERS.monthly.productId) {
      return 'monthly';
    } else if (subscriptionStatus.product_id === SUBSCRIPTION_TIERS.yearly.productId) {
      return 'yearly';
    }
    return null;
  };

  const currentTier = getCurrentTier();
  const isSubscribed = subscriptionStatus?.subscribed;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-2">
            {isSubscribed && (
              <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={checkSubscription} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <h1 className="text-4xl font-bold tracking-tight">
              {isSubscribed ? 'Sua Assinatura' : 'Escolha seu Plano'}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isSubscribed 
              ? 'Você tem acesso completo a todos os recursos da Biblioteca de Leitura.'
              : 'Desbloqueie todos os recursos da Biblioteca de Leitura com nossos planos premium.'
            }
          </p>
          
          {isSubscribed && subscriptionStatus?.subscription_end && (
            <p className="mt-4 text-sm text-muted-foreground">
              Próxima renovação: {new Date(subscriptionStatus.subscription_end).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
                const isCurrentPlan = currentTier === key;
                const isPopular = 'popular' in tier && tier.popular;
                
                return (
                  <Card 
                    key={key} 
                    className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'ring-2 ring-amber-500' : ''}`}
                  >
                    {isPopular && !isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Mais Popular
                      </Badge>
                    )}
                    {isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500">
                        <Crown className="h-3 w-3 mr-1" />
                        Seu Plano Atual
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription>
                        {'savings' in tier && (
                          <span className="text-green-600 font-medium">{tier.savings}</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="text-center">
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        <span className="text-muted-foreground">/{tier.interval}</span>
                      </div>
                      
                      <ul className="space-y-3 text-left">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    
                    <CardFooter>
                      {isCurrentPlan ? (
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={handleManageSubscription}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Gerenciar Assinatura
                        </Button>
                      ) : isSubscribed ? (
                        <Button 
                          className="w-full" 
                          variant="secondary"
                          onClick={handleManageSubscription}
                        >
                          Alterar para este plano
                        </Button>
                      ) : (
                        <Button 
                          className={`w-full ${isPopular ? 'bg-primary' : ''}`}
                          onClick={() => handleCheckout(tier.priceId)}
                          disabled={isCheckingOut !== null}
                        >
                          {isCheckingOut === tier.priceId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            'Assinar Agora'
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* FAQ or Additional Info */}
            <div className="mt-16 text-center">
              <h2 className="text-2xl font-semibold mb-4">Perguntas Frequentes</h2>
              <div className="max-w-2xl mx-auto space-y-4 text-left">
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">Como funciona a assinatura?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Após assinar, você terá acesso imediato a todos os recursos premium. 
                    A cobrança é automática e você pode cancelar a qualquer momento.
                  </p>
                </details>
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">Posso cancelar quando quiser?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Sim! Você pode cancelar sua assinatura a qualquer momento através do botão 
                    "Gerenciar Assinatura". O acesso continua até o fim do período pago.
                  </p>
                </details>
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">Quais formas de pagamento são aceitas?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Aceitamos cartões de crédito (Visa, Mastercard, American Express) e 
                    alguns cartões de débito através do Stripe.
                  </p>
                </details>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
