import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export const PLANS = {
  monthly: {
    priceId: "price_1TbPC5COcC8JTY4z86QKYXkp",
    price: "€5,49",
    label: "Mensal",
    period: "/mês",
  },
  yearly: {
    priceId: "price_1TbPDLCOcC8JTY4zxC9aiArL",
    price: "€52,00",
    label: "Anual",
    period: "/ano",
    savings: "Poupa €13,88",
  },
} as const;

export type StripePlan = keyof typeof PLANS;

export const redirectToCheckout = async (
  plan: StripePlan,
  coupleId: string,
  userEmail: string,
) => {
  const stripe = await stripePromise;
  if (!stripe) return;

  await stripe.redirectToCheckout({
    lineItems: [{ price: PLANS[plan].priceId, quantity: 1 }],
    mode: "subscription",
    successUrl: `${window.location.origin}/profile?success=true`,
    cancelUrl: `${window.location.origin}/profile?canceled=true`,
    clientReferenceId: coupleId,
    customerEmail: userEmail,
  });
};

