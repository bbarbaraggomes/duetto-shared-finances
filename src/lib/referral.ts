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
  referredCoupleId: string,
  referralCode: string
) => {
  // Atualizar status do referral
  await supabase
    .from('referrals' as any)
    .update({
      status: 'completed',
      referred_couple_id: referredCoupleId,
      completed_at: new Date().toISOString()
    })
    .eq('referral_code', referralCode);

  // Dar 1 mês grátis ao casal que convidou
  const { data: referrerSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('couple_id', referrerCoupleId)
    .single();

  if (referrerSub) {
    await supabase
      .from('subscriptions')
      .update({
        free_months_remaining: ((referrerSub as any).free_months_remaining || 0) + 1,
        status: 'active'
      } as any)
      .eq('couple_id', referrerCoupleId);
  } else {
    await supabase
      .from('subscriptions')
      .insert({
        couple_id: referrerCoupleId,
        free_months_remaining: 1,
        status: 'active'
      } as any);
  }

  // Dar 1 mês grátis ao casal novo
  const { data: referredSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('couple_id', referredCoupleId)
    .single();

  if (referredSub) {
    await supabase
      .from('subscriptions')
      .update({
        free_months_remaining: ((referredSub as any).free_months_remaining || 0) + 1,
        status: 'active'
      } as any)
      .eq('couple_id', referredCoupleId);
  } else {
    await supabase
      .from('subscriptions')
      .insert({
        couple_id: referredCoupleId,
        free_months_remaining: 1,
        status: 'active'
      } as any);
  }

  // Limpar o código do localStorage
  localStorage.removeItem('duetto_referral_code');
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
