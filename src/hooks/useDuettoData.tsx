import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
 
export type Category =
  | "casa" | "mercado" | "restaurante" | "transporte"
  | "saude" | "lazer" | "viagem" | "outros"
  | "trabalho" | "renda" | "freelance" | "investimento"
  | "presente" | "reembolso" | "bonus" | "outro";
 
export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "casa", label: "Casa", emoji: "🏠" },
  { id: "mercado", label: "Mercado", emoji: "🛒" },
  { id: "restaurante", label: "Restaurante", emoji: "🍽️" },
  { id: "transporte", label: "Transporte", emoji: "🚗" },
  { id: "saude", label: "Saúde", emoji: "💊" },
  { id: "lazer", label: "Lazer", emoji: "🎬" },
  { id: "viagem", label: "Viagem", emoji: "✈️" },
  { id: "outros", label: "Outros", emoji: "📦" },
];
 
export type PaidBy = "me" | "partner";
 
export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  note?: string;
  paidBy: PaidBy;
  date: string;
  type: "expense" | "income";
}
 
export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  current: number;
  deadline: string;
}
 
export interface Couple {
  me: { name: string; email: string };
  partner: { name: string; email: string; pending?: boolean };
  subscription: {
    status: "trial" | "active" | "expired";
    daysLeft?: number;
    plan?: string;
    currentPeriodEnd?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    isLifetime?: boolean;
  };
}
 
interface Ctx {
  couple: Couple;
  setCouple: (c: Couple) => void;
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  goals: Goal[];
  setGoals: (g: Goal[]) => void;
  addGoal: (g: Omit<Goal, "id" | "current">) => void;
  loading: boolean;
  userId: string | null;
  createCouple: (uid: string) => Promise<void>;
}
 
const DuettoContext = createContext<Ctx | null>(null);
 
const DEFAULT_COUPLE: Couple = {
  me: { name: "", email: "" },
  partner: { name: "", email: "", pending: true },
  subscription: { status: "trial", daysLeft: 14 },
};
 
export const DuettoProvider = ({ children }: { children: ReactNode }) => {
  const [couple, setCouple] = useState<Couple>(DEFAULT_COUPLE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
 
  const coupleIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
 
  const createCouple = async (uid: string) => {
    const { data: existing } = await supabase
      .from("couples")
      .select("id")
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .maybeSingle();
 
    if (existing) return;
 
    const { data: newCouple } = await supabase
      .from("couples")
      .insert({ user1_id: uid, status: "pending" })
      .select()
      .single();
 
    if (newCouple) {
      setCoupleId(newCouple.id);
      coupleIdRef.current = newCouple.id;
      await supabase.from("subscriptions").insert({ couple_id: newCouple.id });
    }
  };
 
  const loadData = async (uid: string, email: string, metadata: any) => {
    setLoading(true);
    userIdRef.current = uid;
    setUserId(uid);
 
    const { data: profile } = await supabase
      .from("users").select("*").eq("id", uid).maybeSingle();
 
    if (!profile) {
      await supabase.from("users").upsert({
        id: uid,
        email,
        full_name: metadata?.full_name || email?.split("@")[0],
      }, { onConflict: "id", ignoreDuplicates: true });
    }
 
    const myName = profile?.full_name || metadata?.full_name || email?.split("@")[0] || "";
    const myEmail = email || "";
 
    const { data: couples } = await supabase
      .from("couples")
      .select("*")
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(1);
 
    const coupleData = couples?.[0] ?? null;
 
    if (coupleData) {
      setCoupleId(coupleData.id);
      coupleIdRef.current = coupleData.id;
 
      const partnerId = coupleData.user1_id === uid ? coupleData.user2_id : coupleData.user1_id;
      let partnerName = "";
      let partnerEmail = "";
      let partnerPending = !partnerId;
 
      if (partnerId) {
        const { data: partnerProfile } = await supabase
          .from("users").select("full_name, email").eq("id", partnerId).maybeSingle();
 
        if (partnerProfile) {
          partnerName = partnerProfile.full_name || "";
          partnerEmail = partnerProfile.email || "";
          partnerPending = false;
        }
      }
 
      const { data: sub } = await supabase
        .from("subscriptions").select("*").eq("couple_id", coupleData.id).maybeSingle();
 
      const daysLeft = sub?.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
        : 14;
 
      const rawStatus = sub?.status as string | undefined;
      const isLifetime = Boolean((sub as unknown as { is_lifetime?: boolean })?.is_lifetime);
      const isActive = rawStatus === "active" || isLifetime;
      const isPastDueOrCanceled = rawStatus === "past_due" || rawStatus === "canceled";
      const computedStatus: Couple["subscription"]["status"] =
        isActive ? "active" : !isPastDueOrCanceled && daysLeft > 0 ? "trial" : "expired";

      setCouple({
        me: { name: myName, email: myEmail },
        partner: { name: partnerName, email: partnerEmail, pending: partnerPending },
        subscription: {
          status: computedStatus,
          daysLeft: computedStatus === "trial" ? daysLeft : 0,
          plan: sub?.plan,
          currentPeriodEnd: sub?.current_period_end ?? null,
          stripeCustomerId: (sub as unknown as { stripe_customer_id?: string | null })?.stripe_customer_id ?? null,
          stripeSubscriptionId: (sub as unknown as { stripe_subscription_id?: string | null })?.stripe_subscription_id ?? null,
          isLifetime,
        },
      });
 
      const { data: txData } = await supabase
        .from("transactions").select("*").eq("couple_id", coupleData.id).order("date", { ascending: false });
 
      if (txData) {
        setTransactions(txData.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          category: (t.category as Category) || "outros",
          note: t.description,
          paidBy: t.user_id === uid ? "me" : "partner",
          date: t.date,
          type: (t.type as "expense" | "income") || "expense",
        })));
      }
 
      const { data: goalsData } = await supabase
        .from("goals").select("*").eq("couple_id", coupleData.id);
 
      if (goalsData) {
        setGoals(goalsData.map((g) => ({
          id: g.id,
          name: g.name,
          emoji: g.emoji || "🎯",
          target: Number(g.target_amount),
          current: Number(g.current_amount),
          deadline: g.deadline || "",
        })));
      }
    } else {
      setCouple({
        me: { name: myName, email: myEmail },
        partner: { name: "", email: "", pending: true },
        subscription: { status: "trial", daysLeft: 14 },
      });
    }
 
    setLoading(false);
  };
 
  // Realtime: quando o casal é actualizado (parceiro aceita convite), recarrega os dados
  useEffect(() => {
    if (!coupleId || !userIdRef.current) return;
 
    const channel = supabase
      .channel(`couple-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couples",
          filter: `id=eq.${coupleId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          // Se o user2_id foi preenchido, recarrega os dados
          if (updated.user2_id && userIdRef.current) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await loadData(session.user.id, session.user.email || "", session.user.user_metadata);
            }
          }
        }
      )
      .subscribe();
 
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);
 
  useEffect(() => {
    let loaded = false;
 
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !loaded) {
        loaded = true;
        loadData(session.user.id, session.user.email || "", session.user.user_metadata);
      }
    });
 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && !loaded) {
        loaded = true;
        loadData(session.user.id, session.user.email || "", session.user.user_metadata);
      }
      if (event === "TOKEN_REFRESHED" && session?.user) {
        loadData(session.user.id, session.user.email || "", session.user.user_metadata);
      }
      if (event === "SIGNED_OUT") {
        loaded = false;
        setCouple(DEFAULT_COUPLE);
        setTransactions([]);
        setGoals([]);
        setUserId(null);
        setCoupleId(null);
        coupleIdRef.current = null;
        userIdRef.current = null;
      }
    });
 
    const timeout = setTimeout(() => { if (!loaded) setLoading(false); }, 3000);
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);
 
  const addTransaction = async (t: Omit<Transaction, "id">) => {
    const cId = coupleIdRef.current;
    const uId = userIdRef.current;
    if (!cId || !uId) return;
    const newTx: Transaction = { ...t, id: crypto.randomUUID() };
    setTransactions((prev) => [newTx, ...prev]);
    const { error } = await supabase.from("transactions").insert({
      id: newTx.id,
      couple_id: cId,
      user_id: uId,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.note,
      date: t.date.split("T")[0],
    });
    if (error) console.error("Erro transactions:", error);
  };
 
  const addGoal = async (g: Omit<Goal, "id" | "current">) => {
    const cId = coupleIdRef.current;
    if (!cId) return;
    const newGoal: Goal = { ...g, id: crypto.randomUUID(), current: 0 };
    setGoals((prev) => [...prev, newGoal]);
    const { error } = await supabase.from("goals").insert({
      id: newGoal.id,
      couple_id: cId,
      name: g.name,
      emoji: g.emoji,
      target_amount: g.target,
      deadline: g.deadline,
    });
    if (error) console.error("Erro goals:", error);
  };
 
  const value = useMemo<Ctx>(
    () => ({ couple, setCouple, transactions, setTransactions, addTransaction, goals, setGoals, addGoal, loading, userId, createCouple }),
    [couple, transactions, goals, loading, userId, coupleId]
  );
 
  return <DuettoContext.Provider value={value}>{children}</DuettoContext.Provider>;
};
 
export const useDuetto = () => {
  const ctx = useContext(DuettoContext);
  if (!ctx) throw new Error("useDuetto must be used within DuettoProvider");
  return ctx;
};
 
export const formatEUR = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
 