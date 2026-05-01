import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Crown, HeartCrack, ChevronRight, Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/duetto/AppShell";
import { useDuetto } from "@/hooks/useDuettoData";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_FUNCTION_URL = "https://maskbsseptaihntezvcm.supabase.co/functions/v1/quick-handler";

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
  const { couple, userId, setCouple } = useDuetto();
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada.");
    navigate("/login");
  };

  const handleCopyInvite = async () => {
    const { data: coupleData, error } = await supabase
      .from("couples")
      .select("id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (error || !coupleData) {
      toast.error("Erro ao gerar link de convite.");
      return;
    }

    const inviteLink = `${window.location.origin}/register?invite=${coupleData.id}`;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setLoadingPlan(plan);
    try {
      const { data: couples } = await supabase
        .from("couples")
        .select("id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .limit(1);

      const coupleId = couples?.[0]?.id;
      if (!coupleId) { toast.error("Erro ao encontrar o casal."); return; }

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          plan,
          coupleId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/profile`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Erro ao criar sessão de pagamento.");
      }
    } catch (err) {
      toast.error("Erro ao processar pagamento.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleUnlink = async () => {
    if (!userId) return;
    setUnlinking(true);
    const { data: couples } = await supabase
      .from("couples")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1);
    const coupleData = couples?.[0];
    if (!coupleData) { toast.error("Erro ao encontrar o casal."); setUnlinking(false); return; }
    await supabase.from("couples").update({ user2_id: null, status: "pending" }).eq("id", coupleData.id);
    setCouple({ ...couple, partner: { name: "", email: "", pending: true } });
    setUnlinking(false);
    setConfirmUnlink(false);
    toast.success("Casal desligado. Podem recomeçar quando quiserem.");
  };

  const sub = couple.subscription;
  const isTrial = sub.status === "trial";
  const subLabel = isTrial
    ? `Trial — ${sub.daysLeft} dias restantes`
    : `Ativo — ${sub.plan ?? "Plano Pro"}`;

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
              {couple.me.name}
              {couple.partner.name ? ` & ${couple.partner.name}` : ""}
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
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <UserPlus size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Convida o(a) teu(tua) parceiro(a)</p>
                <p className="text-[12px] text-muted-foreground">Copia o link e partilha com ele(a)</p>
              </div>
            </div>
            <button
              onClick={handleCopyInvite}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-[14px] font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Link copiado!" : "Copiar link de convite"}
            </button>
          </div>
        </section>
      )}

      <section className="px-6 pt-4">
        <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Crown size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-primary-foreground/60">Subscrição</p>
              <p className="mt-0.5 text-[15px] font-medium">{subLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPlans(true)}
            className="mt-4 flex w-full items-center justify-between rounded-2xl bg-primary-foreground/10 px-4 py-3 text-[14px] font-medium transition-colors hover:bg-primary-foreground/15"
          >
            <span>{isTrial ? "Subscrever agora" : "Gerir subscrição"}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section className="px-6 pt-4 space-y-2 pb-10">
        {!partnerPending && (
          <button
            onClick={() => setConfirmUnlink(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 text-left shadow-soft transition-colors hover:bg-background-soft"
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
          className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-4 text-left shadow-soft transition-colors hover:bg-background-soft"
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

      {showPlans && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] rounded-t-[32px] bg-card px-6 pt-5 pb-10 shadow-card-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-[22px] text-foreground">Escolhe o teu plano</h2>
              <button onClick={() => setShowPlans(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft">
                <span className="text-[16px]">✕</span>
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={loadingPlan !== null}
                className="w-full rounded-2xl border-[1.5px] border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-gold disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[16px] font-medium text-foreground">Plano Mensal</p>
                    <p className="text-[13px] text-muted-foreground">Cancela quando quiseres</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[22px] text-foreground">5,49€</p>
                    <p className="text-[12px] text-muted-foreground">/mês</p>
                  </div>
                </div>
                {loadingPlan === "monthly" && <p className="mt-2 text-[13px] text-accent">A redirecionar...</p>}
              </button>

              <button
                onClick={() => handleSubscribe("yearly")}
                disabled={loadingPlan !== null}
                className="w-full rounded-2xl border-[1.5px] border-accent bg-accent/5 p-5 text-left transition-all hover:shadow-gold disabled:opacity-60 relative"
              >
                <div className="absolute -top-3 right-4 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">
                  2 meses grátis
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[16px] font-medium text-foreground">Plano Anual</p>
                    <p className="text-[13px] text-muted-foreground">4,42€/mês · poupas 13€</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[22px] text-foreground">52,99€</p>
                    <p className="text-[12px] text-muted-foreground">/ano</p>
                  </div>
                </div>
                {loadingPlan === "yearly" && <p className="mt-2 text-[13px] text-accent">A redirecionar...</p>}
              </button>
            </div>
            <p className="mt-5 text-center text-[12px] text-muted-foreground">
              Pagamento seguro via Stripe · Cancela quando quiseres
            </p>
          </div>
        </div>
      )}

      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[360px] rounded-3xl bg-card p-6 shadow-card-up">
            <h3 className="font-display text-[20px] text-foreground">Desligar o casal?</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">
              As vossas contas ficam separadas. O histórico é preservado mas deixam de partilhar despesas e metas.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmUnlink(false)}
                className="flex-1 rounded-2xl bg-background-soft py-3 text-[14px] font-medium text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex-1 rounded-2xl bg-destructive py-3 text-[14px] font-semibold text-destructive-foreground disabled:opacity-60"
              >
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