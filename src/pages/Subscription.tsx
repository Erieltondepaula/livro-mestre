import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Crown, Sparkles, Loader2, CreditCard, RefreshCw, AlertTriangle, RotateCcw, Shield } from 'lucide-react';

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
      'Melhor custo-benefício',
    ],
  },
};

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, user } = useAuth();
  const { subscription, isLoading: isSubscriptionLoading, checkSubscription } = useSubscription();
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);

  // Verificar se é o usuário mestre
  const MASTER_EMAIL = "erieltondepaulamelo@gmail.com";
  const isMasterUser = user?.email?.toLowerCase().trim() === MASTER_EMAIL;

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
    }
  };

  const handleToggleAutoRenew = async () => {
    try {
      setIsTogglingAutoRenew(true);
      const newCancelAtPeriodEnd = !subscription.cancelAtPeriodEnd;
      
      const { data, error } = await supabase.functions.invoke('toggle-auto-renew', {
        body: { cancelAtPeriodEnd: newCancelAtPeriodEnd },
      });

      if (error) throw error;

      toast({
        title: data.cancel_at_period_end ? 'Renovação desativada' : 'Renovação ativada',
        description: data.message,
      });

      await checkSubscription();
    } catch (error) {
      console.error('Toggle auto-renew error:', error);
      toast({
        title: 'Erro ao alterar configuração',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleRequestRefund = async () => {
    try {
      setIsRequestingRefund(true);
      
      const { data, error } = await supabase.functions.invoke('request-refund');

      if (error) throw error;

      toast({
        title: 'Reembolso processado!',
        description: `Valor de R$ ${data.refund_amount.toFixed(2)} será devolvido em até 10 dias úteis.`,
      });

      await checkSubscription();
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: 'Erro ao solicitar reembolso',
        description: error?.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingRefund(false);
    }
  };

  const getCurrentTier = () => {
    if (!subscription?.productId) return null;
    
    if (subscription.productId === SUBSCRIPTION_TIERS.monthly.productId) {
      return 'monthly';
    } else if (subscription.productId === SUBSCRIPTION_TIERS.yearly.productId) {
      return 'yearly';
    }
    return null;
  };

  const currentTier = getCurrentTier();
  const isSubscribed = subscription?.subscribed;

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
            <Button variant="outline" size="sm" onClick={checkSubscription} disabled={isSubscriptionLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSubscriptionLoading ? 'animate-spin' : ''}`} />
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
          
          {isSubscribed && subscription?.subscriptionEnd && (
            <div className="mt-4 space-y-1">
              <p className="text-sm text-muted-foreground">
                {subscription.cancelAtPeriodEnd 
                  ? `Acesso até: ${new Date(subscription.subscriptionEnd).toLocaleDateString('pt-BR')}`
                  : `Próxima renovação: ${new Date(subscription.subscriptionEnd).toLocaleDateString('pt-BR')}`
                }
              </p>
              {subscription.cancelAtPeriodEnd && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Renovação automática desativada
                </Badge>
              )}
            </div>
          )}
        </div>

        {isSubscriptionLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* SEÇÃO ESPECIAL PARA USUÁRIO MESTRE */}
            {isMasterUser && (
              <Card className="max-w-2xl mx-auto mb-12 border-2 border-primary bg-primary/5">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Acesso Vitalício</CardTitle>
                  <CardDescription className="text-base">
                    Você é o <span className="font-bold text-primary">Usuário Mestre</span> do sistema.
                    <br />
                    Seu acesso é permanente e ilimitado - sem cobranças, sem restrições.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-3 text-left max-w-sm mx-auto">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Acesso a todos os módulos</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Cadastro ilimitado de livros</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Painel de administração</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Gerenciar assinaturas de outros usuários</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="justify-center">
                  <Button onClick={() => navigate('/')} variant="default">
                    Voltar ao Dashboard
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Subscription Management Card - Only show if subscribed and NOT master */}
            {isSubscribed && !isMasterUser && (
              <Card className="max-w-2xl mx-auto mb-12">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Gerenciar Assinatura
                  </CardTitle>
                  <CardDescription>
                    Configure as opções da sua assinatura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auto-renew toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-renew" className="text-base">Renovação Automática</Label>
                      <p className="text-sm text-muted-foreground">
                        {subscription.cancelAtPeriodEnd 
                          ? 'Sua assinatura não será renovada automaticamente'
                          : 'Sua assinatura será renovada automaticamente'
                        }
                      </p>
                    </div>
                    <Switch
                      id="auto-renew"
                      checked={!subscription.cancelAtPeriodEnd}
                      onCheckedChange={handleToggleAutoRenew}
                      disabled={isTogglingAutoRenew}
                    />
                  </div>

                  <Separator />

                  {/* Refund option - Only within 7 days */}
                  {subscription.isWithinRefundPeriod && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-600" />
                            Garantia de 7 dias
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Você ainda pode solicitar reembolso total (CDC Art. 49)
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Solicitar Reembolso
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Solicitação de Reembolso</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja cancelar sua assinatura e solicitar reembolso total?
                                <br /><br />
                                • O valor pago será devolvido em até 10 dias úteis
                                <br />
                                • Seu acesso será encerrado imediatamente
                                <br />
                                • Você poderá assinar novamente a qualquer momento
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleRequestRefund}
                                disabled={isRequestingRefund}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isRequestingRefund ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processando...
                                  </>
                                ) : (
                                  'Confirmar Reembolso'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Manage in Stripe Portal */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Dados de Pagamento</Label>
                      <p className="text-sm text-muted-foreground">
                        Altere cartão, veja faturas ou cancele
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                      Abrir Portal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Cards - Esconde para usuário mestre */}
            {!isMasterUser && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
                const isCurrentPlan = currentTier === key;
                const isPopular = 'popular' in tier && tier.popular;
                
                return (
                  <Card 
                    key={key} 
                    className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'ring-2 ring-amber-500' : ''}`}
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
                    
                    <CardFooter className="mt-auto">
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
                          className="w-full bg-primary"
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
            )}

            {/* Guarantee Badge */}
            {!isSubscribed && !isMasterUser && (
              <div className="text-center mt-8">
                <Badge variant="outline" className="text-green-600 border-green-600 py-2 px-4">
                  <Shield className="h-4 w-4 mr-2" />
                  Garantia de 7 dias - Reembolso total se não gostar
                </Badge>
              </div>
            )}

            {/* FAQ */}
            <div className="mt-16 text-center">
              <h2 className="text-2xl font-semibold mb-4">Perguntas Frequentes</h2>
              <div className="max-w-2xl mx-auto space-y-4 text-left">
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">Como funciona a garantia de 7 dias?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Conforme o Código de Defesa do Consumidor (Art. 49), você tem até 7 dias após a compra 
                    para solicitar cancelamento e reembolso total, sem necessidade de justificativa.
                  </p>
                </details>
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">Como desativo a renovação automática?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Na seção "Gerenciar Assinatura" acima, você pode desativar a renovação automática. 
                    Seu acesso continua até o fim do período pago, mas não será cobrado novamente.
                  </p>
                </details>
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">Quais formas de pagamento são aceitas?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Aceitamos cartões de crédito (Visa, Mastercard, American Express) e 
                    alguns cartões de débito através do Stripe.
                  </p>
                </details>
                <details className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">O que acontece se eu não renovar?</summary>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Ao fim do período pago, seu acesso aos módulos será bloqueado até que você 
                    realize um novo pagamento. Seus dados permanecerão salvos.
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
