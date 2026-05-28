import { supabase } from "@/integrations/supabase/client";

/**
 * Gera um código de referral único baseado no coupleId
 */
export const generateReferralCode = (coupleId: string): string => {
  // Usa os primeiros 8 caracteres do UUID em maiúsculas
  return coupleId.substring(0, 8).toUpperCase();
};

/**
 * Devolve o link de referral completo
 */
export const getReferralLink = (coupleId: string): string => {
  const code = generateReferralCode(coupleId);
  return `${window.location.origin}/register?ref=${code}`;
};

/**
 * Aplica a recompensa de 1 mês grátis a ambos os casais
 */
export const applyReferralReward = async (
  referrerCoupleId: string,
  referredCoupleId: string
): Promise<boolean> => {
  try {
    // Primeiro, busca os valores atuais
    const { data: referrerSub, error: referrerFetchError } = await supabase
      .from("subscriptions")
      .select("free_months_remaining")
      .eq("couple_id", referrerCoupleId)
      .single();

    if (referrerFetchError) {
      console.error("Erro ao buscar subscrição do referenciador:", referrerFetchError);
      return false;
    }

    const { data: referredSub, error: referredFetchError } = await supabase
      .from("subscriptions")
      .select("free_months_remaining")
      .eq("couple_id", referredCoupleId)
      .single();

    if (referredFetchError) {
      console.error("Erro ao buscar subscrição do referenciado:", referredFetchError);
      return false;
    }

    // Atualiza o referenciador
    const { error: referrerError } = await supabase
      .from("subscriptions")
      .update({ free_months_remaining: ((referrerSub as any)?.free_months_remaining || 0) + 1 } as any)
      .eq("couple_id", referrerCoupleId);

    if (referrerError) {
      console.error("Erro ao adicionar mês grátis ao referenciador:", referrerError);
      return false;
    }

    // Atualiza o referenciado
    const { error: referredError } = await supabase
      .from("subscriptions")
      .update({ free_months_remaining: ((referredSub as any)?.free_months_remaining || 0) + 1 } as any)
      .eq("couple_id", referredCoupleId);

    if (referredError) {
      console.error("Erro ao adicionar mês grátis ao referenciado:", referredError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao aplicar recompensa de referral:", error);
    return false;
  }
};

/**
 * Busca o coupleId pelo código de referral
 */
export const getCoupleIdByReferralCode = async (
  code: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("referrals" as any)
      .select("referrer_couple_id")
      .eq("referral_code", code)
      .single();

    if (error || !data) {
      return null;
    }

    return (data as any).referrer_couple_id;
  } catch (error) {
    console.error("Erro ao buscar coupleId por código de referral:", error);
    return null;
  }
};

/**
 * Cria um registro de referral para um casal
 */
export const createReferralRecord = async (
  coupleId: string
): Promise<boolean> => {
  try {
    const code = generateReferralCode(coupleId);

    const { error } = await supabase
      .from("referrals" as any)
      .insert({
        referrer_couple_id: coupleId,
        referral_code: code,
        status: "pending",
      });

    if (error) {
      // Se já existir, não é erro
      if (error.code === "23505") {
        return true;
      }
      console.error("Erro ao criar registro de referral:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao criar registro de referral:", error);
    return false;
  }
};

/**
 * Conta quantos casais foram convidados por um casal
 */
export const getReferralCount = async (coupleId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("referrals" as any)
      .select("id")
      .eq("referrer_couple_id", coupleId)
      .eq("status", "completed");

    if (error || !data) {
      return 0;
    }

    return data.length;
  } catch (error) {
    console.error("Erro ao contar referrals:", error);
    return 0;
  }
};

/**
 * Marca um referral como completado
 */
export const completeReferral = async (
  referrerCoupleId: string,
  referredCoupleId: string,
  code: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("referrals" as any)
      .update({
        referred_couple_id: referredCoupleId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("referrer_couple_id", referrerCoupleId)
      .eq("referral_code", code);

    if (error) {
      console.error("Erro ao completar referral:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao completar referral:", error);
    return false;
  }
};
