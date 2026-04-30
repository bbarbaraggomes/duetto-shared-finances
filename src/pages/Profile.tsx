import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Crown, HeartCrack, ChevronRight, Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/duetto/AppShell";
import { useDuetto } from "@/hooks/useDuettoData";
import { supabase } from "@/integrations/supabase/client";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada.");
    navigate("/");
  };

  const handleCopyInvite = async () => {
    let coupleData = null;

    const { data: c1 } = await supabase
      .from("couples")
      .select("id")
      .eq("user1_id", userId)
      .maybeSingle();

    if (c1) {
      coupleData = c1;
    } else {
      const { data: c2 } = await supabase
        .from("couples")
        .select("id")
        .eq("user2_id", userId)
        .maybeSingle();
      if (c2) coupleData = c2;
    }

    if (!coupleData) {
      toast.error("Erro ao gerar link de convite.");
      return;
    }

    const inviteLink = `${window.location.origin}/register?invite=${coupleData.id}`;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleUnlink = async () => {
    if (!userId) return;
    setUnlinking(true);

    // Buscar o casal actual
    const { data: couples } = await supabase
      .from("couples")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1);

    const coupleData = couples?.[0];

    if (!coupleData) {
      toast.error("Erro ao encontrar o casal.");
      setUnlinking(false);
      return;
    }

    // Se eu sou o user1 — remover o user2
    // Se eu sou o user2 — remover-me do casal (user2 = null)
    if (coupleData.user1_id === userId) {
      await supabase
        .from("couples")
        .update({ user2_id: null, status: "pending" })
        .eq("id", coupleData.id);
    } else {
      await supabase
        .from("couples")
        .update({ user2_id: null, status: "pending" })
        .eq("id", coupleData.id);
    }

    // Actualizar o estado local
    setCouple({
      ...couple,
      partner: { name: "", email: "", pending: true },
    });

    setUnlinking(false);
    setConfirmUnlink(false);
    toast.success("Casal desligado. Podem recomeçar quando quiserem.");
  };

  const sub = couple.subscription;
  const subLabel =
    sub.status === "trial"
      ? `Trial — ${sub.daysLeft} dias restantes`
      : `Ativo — ${sub.plan ?? "Plano Anual"}`;

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
            onClick={() => toast.info("Em breve.")}
            className="mt-4 flex w-full items-center justify-between rounded-2xl bg-primary-foreground/10 px-4 py-3 text-[14px] font-medium transition-colors hover:bg-primary-foreground/15"
          >
            <span>Gerir subscrição</span>
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