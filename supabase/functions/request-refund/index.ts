import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-REFUND] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("Nenhuma assinatura encontrada para este usuário");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("Nenhuma assinatura ativa encontrada");
    }

    const subscription = subscriptions.data[0];
    const subscriptionStart = new Date(subscription.current_period_start * 1000);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24));

    logStep("Checking refund eligibility", { daysSinceStart, subscriptionStart: subscriptionStart.toISOString() });

    // Check if within 7-day refund period (Brazilian consumer law - CDC Art. 49)
    if (daysSinceStart > 7) {
      throw new Error("O período de 7 dias para reembolso já expirou. Você pode cancelar sua assinatura para não ser cobrado no próximo período.");
    }

    // Get the latest invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      limit: 1,
    });

    if (invoices.data.length === 0 || !invoices.data[0].payment_intent) {
      throw new Error("Não foi possível encontrar o pagamento para reembolso");
    }

    const paymentIntentId = invoices.data[0].payment_intent as string;
    logStep("Found payment intent", { paymentIntentId });

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    });
    logStep("Refund created", { refundId: refund.id, amount: refund.amount });

    // Cancel the subscription immediately
    await stripe.subscriptions.cancel(subscription.id);
    logStep("Subscription cancelled", { subscriptionId: subscription.id });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Reembolso processado com sucesso. Sua assinatura foi cancelada.",
      refund_id: refund.id,
      refund_amount: refund.amount / 100,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in request-refund", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
