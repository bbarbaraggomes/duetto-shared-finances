/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "npm:stripe@14.24.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const getUnitAmount = (plan: string) => {
  if (plan === "monthly") return 549; // 5,49€
  if (plan === "yearly") return 5200; // 52,00€
  throw new Error("Plano inválido.");
};

const getInterval = (plan: string) => {
  if (plan === "monthly") return "month";
  if (plan === "yearly") return "year";
  throw new Error("Plano inválido.");
};

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring("Bearer ".length) : null;
    if (!token) return new Response(JSON.stringify({ error: "Missing Authorization bearer token." }), { status: 401 });

    const { plan, coupleId, successUrl, cancelUrl } = await req.json();
    if (!plan || !coupleId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), { status: 400 });
    }

    // Validate user belongs to the couple (security).
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    }
    const userId = userData.user.id;

    const { data: coupleRow, error: coupleError } = await supabase
      .from("couples")
      .select("id")
      .eq("id", coupleId)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle();

    if (coupleError || !coupleRow) {
      return new Response(JSON.stringify({ error: "Couple not found or user not allowed." }), { status: 404 });
    }

    // Reuse existing customer if we already have it.
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("couple_id", coupleId)
      .maybeSingle();

    const existingCustomerId = (subRow as any)?.stripe_customer_id as string | null | undefined;
    const customerId = existingCustomerId || (await stripe.customers.create({
      email: userData.user.email || undefined,
      metadata: { coupleId },
    })).id;

    // Create Stripe hosted checkout for subscription.
    const unitAmount = getUnitAmount(plan);
    const interval = getInterval(plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: unitAmount,
            product_data: {
              name: "Duetto",
              description: "Duetto Shared Finances",
            },
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: { coupleId },
      },
      metadata: {
        coupleId,
        plan,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as any)?.message || String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

