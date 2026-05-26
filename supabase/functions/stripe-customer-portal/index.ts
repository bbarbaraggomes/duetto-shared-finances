/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "npm:stripe@14.24.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring("Bearer ".length) : null;
    if (!token) return new Response(JSON.stringify({ error: "Missing Authorization bearer token." }), { status: 401 });

    const { coupleId, returnUrl } = await req.json();
    if (!coupleId) return new Response(JSON.stringify({ error: "Missing coupleId." }), { status: 400 });

    // Validate user belongs to the couple.
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

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("couple_id", coupleId)
      .maybeSingle();

    const stripeCustomerId = (subRow as any)?.stripe_customer_id as string | null | undefined;
    if (!stripeCustomerId) {
      return new Response(JSON.stringify({ error: "Customer não encontrado para esta subscrição." }), { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${(Deno.env.get("SITE_URL") || "").toString()}/profile`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as any)?.message || String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

