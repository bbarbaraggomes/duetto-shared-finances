import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Crown, HeartCrack, ChevronRight, Copy, Check, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/duetto/AppShell";
import { useDuetto } from "@/hooks/useDuettoData";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout, type StripePlan, PLANS } from "@/lib/stripe";
 
const Avatar = ({ name, accent }: { name: string; accent?: boolean }) => (
  <div
    className={`flex h-16 w-16 items-center justify-center rounded-full font-display text-[22px] ${
      accent ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
    }`}
  >
    {name ? name.charAt(0).toUpperCase() : "?"}
  </div>
);
 
const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { couple, userId: contextUserId, setCouple } = useDuetto();
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
 
  // Modo de ligação: mostrar código próprio ou introduzir código do parceiro
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
 
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 6;
 
    const fetchCouple = async () => {
      let uid = contextUserId;
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id || null;
      }
      if (!uid) {
        if (attempts < maxAttempts) { attempts++; setTimeout(fetchCouple, 800); }
        return;
      }
 
      const { data } = await supabase
        .from("couples")
        .select("id, invite_code")
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
        .limit(1)
        .maybeSingle();
 
      if (data) {
        setCoupleId(data.id);
        setInviteCode(data.invite_code || null);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(fetchCouple, 800);
      }
    };
 
    fetchCouple();
  }, [contextUserId]);

  useEffect(() => {
    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    const upgrade = searchParams.get("upgrade") === "1";

    if (success) toast.success("Subscrição ativada! Bem-vindos ao Duetto 🎉");
    if (canceled) toast.error("Pagamento cancelado");
    if (upgrade) setShowPlans(true);
  }, [searchParams]);
 
  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCodeCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCodeCopied(false), 3000);
  };
 
  const handleJoinWithCode = async () => {
    if (joinCode.length !== 4) {
      toast.error("Introduz um código de 4 dígitos.");
      return;
    }
 
    setJoining(true);
 
    let uid = contextUserId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id || null;
    }
 
    if (!uid) {
      toast.error("Erro de autenticação.");
      setJoining(false);
      return;
    }
 
    // Procura o casal com este código
    const { data: targetCouple } = await supabase
      .from("couples")
      .select("id, user1_id, user2_id")
      .eq("invite_code", joinCode.trim())
      .maybeSingle();
 
    if (!targetCouple) {
      toast.error("Código inválido. Verifica e tenta novamente.");
      setJoining(false);
      return;
    }
 
    if (targetCouple.user2_id) {
      toast.error("Este casal já está completo.");
      setJoining(false);
      return;
    }
 
    if (targetCouple.user1_id === uid) {
      toast.error("Não podes ligar-te ao teu próprio casal.");
      setJoining(false);
      return;
    }
 
    // Liga ao casal
    const { error } = await supabase
      .from("couples")
      .update({ user2_id: uid, status: "active" })
      .eq("id", targetCouple.id)
      .is("user2_id", null);
 
    if (error) {
      toast.error("Erro ao ligar ao casal.");
      setJoining(false);
      return;
    }
 
    // Remove o casal vazio deste utilizador se existir
    if (coupleId && coupleId !== targetCouple.id) {
      await supabase.from("couples").delete().eq("id", coupleId).is("user2_id", null);
    }
 
    toast.success("Casal ligado com sucesso!");
    setJoining(false);
    setShowJoinInput(false);
 
    // Reload para actualizar os dados
    setTimeout(() => window.location.reload(), 500);
  };
 
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada.");
    navigate("/login");
  };
 
  const handleSubscribe = async (plan: StripePlan) => {
    setLoadingPlan(plan);
    try {
      if (!coupleId) { toast.error("Erro ao encontrar o casal."); return; }
      const email = couple.me.email || "";
      await redirectToCheckout(plan, coupleId, email);
    } catch (e) {
      const msg = e instanceof Error ? e.message : undefined;
      toast.error(msg || "Erro ao processar pagamento.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleUnlink = async () => {
    if (!coupleId) return;
    setUnlinking(true);
    await supabase.from("couples").update({ user2_id: null, status: "pending" }).eq("id", coupleId);
    setCouple({ ...couple, partner: { name: "", email: "", pending: true } });
    setUnlinking(false);
    setConfirmUnlink(false);
    toast.success("Casal desligado.");
  };
 
  const sub = couple.subscription;
  const isActive = sub.status === "active";
  const isTrial = sub.status === "trial";
  const isExpired = sub.status === "expired";
  const planLabel = sub.plan === "yearly" ? "Plano Anual" : "Plano Mensal";
  const subLabel = isActive
    ? `Ativo — ${planLabel}`
    : isTrial
      ? `Trial — ${sub.daysLeft ?? 0} dias restantes`
      : isExpired
        ? "Expirado — Subscreve para continuar"
        : "Subscreve para continuar";

  const renewalDate = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const partnerPending = couple.partner.pending;
 
  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-[13px] text-muted-foreground">A vossa conta</p>
        <h1 className="mt-1 font-display text-[26px] text-foreground">Perfil</h1>
      </header>
 
      <section className="px-6">
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <div className="flex items-center justify-center gap-4">
            <Avatar name={couple.me.name} />
            <div className="font-display text-[22px] text-accent">&</div>
            <Avatar name={couple.partner.name || "?"} accent />
          </div>
          <div className="mt-4 text-center">
            <p className="font-display text-[20px] text-foreground">
              {couple.me.name}{couple.partner.name ? ` & ${couple.partner.name}` : ""}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {partnerPending ? "A aguardar parceiro(a)..." : "Juntos no Duetto"}
            </p>
          </div>
        </div>
      </section>
 
      {partnerPending && (
        <section className="px-6 pt-4">
          <div className="rounded-3xl border border-accent/30 bg-accent/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground">Ligar ao parceiro(a)</p>
                <p className="text-[12px] text-muted-foreground">Usa o código para vos ligar</p>
              </div>
            </div>
 
            {/* Código próprio */}
            {inviteCode && !showJoinInput && (
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  O teu código de convite
                </p>
                <div className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4">
                  <span className="font-display text-[36px] tracking-[0.3em] text-primary-foreground">
                    {inviteCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"
                  >
                    {codeCopied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground text-center">
                  Partilha este código com o(a) teu(tua) parceiro(a)
                </p>
              </div>
            )}
 
            {/* Input para introduzir código do parceiro */}
            {!showJoinInput ? (
              <button
                onClick={() => setShowJoinInput(true)}
                className="w-full rounded-2xl border border-accent/40 py-3 text-[14px] font-medium text-accent text-center"
              >
                Tenho um código do(a) meu(minha) parceiro(a)
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-foreground">Código do(a) parceiro(a)</p>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  maxLength={4}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-display text-[32px] tracking-[0.4em] text-foreground outline-none focus:border-accent"
                />
                <button
                  onClick={handleJoinWithCode}
                  disabled={joining || joinCode.length !== 4}
                  className="w-full rounded-2xl bg-accent py-3 text-[14px] font-medium text-accent-foreground disabled:opacity-60"
                >
                  {joining ? "A ligar..." : "Ligar ao casal"}
                </button>
                <button
                  onClick={() => { setShowJoinInput(false); setJoinCode(""); }}
                  className="w-full text-center text-[13px] text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </section>
      )}
 
      <section className="px-6 pt-4">
        {sub.isLifetime ? (
          <div
            className="relative overflow-hidden rounded-3xl p-5 text-primary shadow-soft"
            style={{
              background:
                "linear-gradient(135deg, hsl(37 55% 78%) 0%, hsl(37 45% 60%) 55%, hsl(37 55% 72%) 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
              style={{ background: "hsl(45 80% 90% / 0.6)" }}
            />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-accent shadow-gold">
                <Sparkles size={22} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary/60">
                  Subscrição
                </p>
                <p className="mt-0.5 font-display text-[20px] leading-tight text-primary">
                  Acesso Vitalício — Fundador
                </p>
              </div>
            </div>
            <p className="relative mt-4 text-[13px] leading-relaxed text-primary/80">
              Obrigado por fazeres parte da história do Duetto.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Crown size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wide text-primary-foreground/60">Subscrição</p>
                <p className="mt-0.5 text-[15px] font-medium">{subLabel}</p>
                {isActive && renewalDate && (
                  <p className="mt-1 text-[13px] text-primary-foreground/70">Renova em {renewalDate}</p>
                )}
                {isTrial && (
                  <p className="mt-1 text-[13px] text-primary-foreground/80">
                    Trial de 14 dias · {sub.daysLeft ?? 0} dias restantes
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={loadingPlan !== null}
                className="w-full rounded-2xl border-[1.5px] border-border bg-primary-foreground/5 p-4 text-left transition-all hover:border-accent disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-primary-foreground">
                      Subscrever — {PLANS.monthly.price}/mês
                    </p>
                    <p className="text-[12px] text-primary-foreground/70">Plano Mensal</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[20px] text-primary-foreground">{PLANS.monthly.price}</p>
                    <p className="text-[11px] text-primary-foreground/70">{PLANS.monthly.period}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleSubscribe("yearly")}
                disabled={loadingPlan !== null}
                className="relative w-full rounded-2xl border-[1.5px] border-accent bg-accent/10 p-4 text-left transition-all disabled:opacity-60"
              >
                <div className="absolute -top-3 right-4 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">
                  {PLANS.yearly.savings}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-primary-foreground">
                      Subscrever — {PLANS.yearly.price}/ano
                    </p>
                    <p className="text-[12px] text-primary-foreground/70">
                      {PLANS.yearly.label} · {PLANS.yearly.savings}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[20px] text-primary-foreground">{PLANS.yearly.price}</p>
                    <p className="text-[11px] text-primary-foreground/70">{PLANS.yearly.period}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </section>
 
      <section className="px-6 pt-4 space-y-2 pb-10">
        {!partnerPending && (
          <button
            onClick={() => setConfirmUnlink(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 text-left shadow-soft"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <HeartCrack size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-medium text-foreground">Desligar o casal</p>
              <p className="text-[12px] text-muted-foreground">Separar as contas no Duetto</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        )}
 
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 text-left shadow-soft"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-soft text-foreground">
            <LogOut size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-foreground">Terminar sessão</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </section>
 
      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[360px] rounded-3xl bg-card p-6 shadow-card-up">
            <h3 className="font-display text-[20px] text-foreground">Desligar o casal?</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">
              As vossas contas ficam separadas. O histórico é preservado.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmUnlink(false)}
                className="flex-1 rounded-2xl bg-background-soft py-3 text-[14px] font-medium text-foreground">
                Cancelar
              </button>
              <button onClick={handleUnlink} disabled={unlinking}
                className="flex-1 rounded-2xl bg-destructive py-3 text-[14px] font-semibold text-destructive-foreground disabled:opacity-60">
                {unlinking ? "A desligar..." : "Desligar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
 
export default Profile;
 