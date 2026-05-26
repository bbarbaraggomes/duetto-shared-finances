/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.24.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe signature", { status: 400 });
    }

    const rawBody = await req.text();

    const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);

    const eventType = event.type;

    if (eventType === "checkout.session.completed") {
      const session = event.data.object as any;
      const coupleId = session?.metadata?.coupleId as string | undefined;
      const plan = session?.metadata?.plan as string | undefined;

      const stripeCustomerId = session?.customer as string | undefined;
      const stripeSubscriptionId = session?.subscription as string | undefined;

      if (!coupleId) {
        return new Response("Missing coupleId in session metadata", { status: 400 });
      }

      // Fetch subscription to get current_period_end
      let currentPeriodEndIso: string | null = null;
      if (stripeSubscriptionId) {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        currentPeriodEndIso = sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
      }

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan: plan || "trial",
          stripe_customer_id: stripeCustomerId || null,
          stripe_subscription_id: stripeSubscriptionId || null,
          current_period_end: currentPeriodEndIso,
        })
        .eq("couple_id", coupleId);
    }

    if (eventType === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      const stripeSubscriptionId = subscription?.id as string | undefined;
      const coupleId = subscription?.metadata?.coupleId as string | undefined;

      const updater = supabase.from("subscriptions").update({ status: "canceled" });
      if (coupleId) updater.eq("couple_id", coupleId);
      else if (stripeSubscriptionId) updater.eq("stripe_subscription_id", stripeSubscriptionId);

      await updater;
    }

    if (eventType === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const stripeSubscriptionId = invoice?.subscription as string | undefined;
      const coupleId = invoice?.metadata?.coupleId as string | undefined;

      const updater = supabase.from("subscriptions").update({ status: "past_due" });
      if (coupleId) updater.eq("couple_id", coupleId);
      else if (stripeSubscriptionId) updater.eq("stripe_subscription_id", stripeSubscriptionId);

      await updater;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as any)?.message || String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

