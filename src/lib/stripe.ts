import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

export type StripePlan = "monthly" | "yearly";

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : Promise.resolve(null);

const STRIPE_CHECKOUT_FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/stripe-checkout-session`
  : "";
const STRIPE_CUSTOMER_PORTAL_FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/stripe-customer-portal`
  : "";

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const redirectToCheckout = async (plan: StripePlan, coupleId: string) => {
  if (!STRIPE_CHECKOUT_FUNCTION_URL) throw new Error("Stripe checkout function URL missing.");
  const stripe = await stripePromise;
  if (!stripe) throw new Error("Stripe not configured (missing VITE_STRIPE_PUBLIC_KEY).");

  const token = await getAccessToken();
  if (!token) throw new Error("Sem sessão de autenticação.");

  const origin = window.location.origin;
  const successUrl = `${origin}/profile?success=true`;
  const cancelUrl = `${origin}/profile?canceled=true`;

  const res = await fetch(STRIPE_CHECKOUT_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan, coupleId, successUrl, cancelUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Erro ao criar sessão de checkout.");
  }

  if (data?.sessionId) {
    const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    if (result?.error) throw new Error(result.error.message || "Falha ao redirecionar para checkout.");
    return;
  }

  // Compatibilidade caso a function retorne uma URL direta.
  if (data?.url) {
    window.location.href = data.url;
    return;
  }

  throw new Error("Resposta inesperada da função de checkout.");
};

export const openCustomerPortal = async (coupleId: string) => {
  if (!STRIPE_CUSTOMER_PORTAL_FUNCTION_URL) throw new Error("Stripe customer portal function URL missing.");

  const token = await getAccessToken();
  if (!token) throw new Error("Sem sessão de autenticação.");

  const origin = window.location.origin;
  const returnUrl = `${origin}/profile`;

  const res = await fetch(STRIPE_CUSTOMER_PORTAL_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ coupleId, returnUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Erro ao abrir customer portal.");
  }

  if (!data?.url) throw new Error("Customer portal não devolveu URL.");
  window.location.href = data.url;
};

