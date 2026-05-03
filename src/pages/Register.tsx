import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DuettoLogo } from "@/components/duetto/DuettoLogo";
import { AuthInput } from "@/components/duetto/AuthInput";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";
import { GoogleSignInButton } from "@/components/duetto/GoogleSignInButton";

type Step = "form" | "invite" | "waiting" | "join";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");

  const [step, setStep] = useState<Step>(inviteId ? "join" : "form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(inviteId);

  // Registo normal (sem convite) ou aceitação de convite via email/password
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      toast.error("A palavra-passe tem de ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);

    // Fluxo: aceitar convite via email/password
    if (inviteId) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) { toast.error(error.message); setSubmitting(false); return; }

      const uid = data.user?.id;
      if (!uid) { toast.error("Erro ao criar conta."); setSubmitting(false); return; }

      await supabase.from("users").upsert({
        id: uid, email, full_name: name,
      }, { onConflict: "id", ignoreDuplicates: true });

      const { error: coupleError } = await supabase
        .from("couples")
        .update({ user2_id: uid, status: "active" })
        .eq("id", inviteId)
        .is("user2_id", null);

      if (coupleError) {
        toast.error("Erro ao ligar ao casal.");
        setSubmitting(false);
        return;
      }

      toast.success("Conta criada! Bem-vindo(a) ao Duetto.");
      setSubmitting(false);
      navigate("/dashboard");
      return;
    }

    // Fluxo: registo novo (sem convite)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    const uid = data.user?.id;
    if (!uid) { toast.error("Erro ao criar conta. Tente novamente."); setSubmitting(false); return; }

    await supabase.from("users").upsert({
      id: uid, email, full_name: name,
    }, { onConflict: "id", ignoreDuplicates: true });

    // Cria o casal para o novo utilizador
    const { data: newCouple } = await supabase
      .from("couples")
      .insert({ user1_id: uid, status: "pending" })
      .select()
      .single();

    if (newCouple) {
      setCoupleId(newCouple.id);
      await supabase.from("subscriptions").insert({ couple_id: newCouple.id });
    }

    setSubmitting(false);
    setStep("invite");
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerEmail) { toast.error("Indique o email do(a) parceiro(a)."); return; }
    setSubmitting(true);

    if (coupleId) {
      await supabase
        .from("couples")
        .update({ invite_email: partnerEmail })
        .eq("id", coupleId);
    }

    setSubmitting(false);
    setStep("waiting");
  };

  // Aceitar convite via Google — guarda o inviteId no localStorage ANTES do redirect
  const handleGoogleJoin = async () => {
    setGoogleLoading(true);

    if (inviteId) {
      localStorage.setItem("duetto_join_couple", inviteId);
      console.log("💾 Convite guardado no localStorage:", inviteId);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error("Erro ao entrar com Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-warm-gradient">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <section className="relative flex min-h-[30dvh] flex-col items-center justify-center px-6 pt-10 pb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-8 h-56 w-56 rounded-full blur-3xl"
            style={{ background: "hsl(var(--accent) / 0.3)" }}
          />
          <Link
            to="/login"
            className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-card/70 text-foreground shadow-soft"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="relative z-10 flex flex-col items-center animate-fade-in">
            <DuettoLogo size={44} />
            <h1 className="mt-3 font-display text-[28px] leading-none text-foreground">
              {step === "form"
                ? "Criar conta"
                : step === "invite"
                ? "Convidar parceiro(a)"
                : step === "join"
                ? "Aceitar convite"
                : "A aguardar..."}
            </h1>
          </div>
        </section>

        <section className="relative z-10 flex-1 animate-card-rise rounded-t-[32px] bg-card px-8 pt-8 pb-10 shadow-card-up">

          {/* STEP: join — aceitar convite */}
          {step === "join" && (
            <>
              <p className="text-center text-[13px] text-muted-foreground">Foste convidado(a)</p>
              <h2 className="mt-1 text-center font-display text-[24px] leading-tight text-foreground">
                Junta-te ao Duetto
              </h2>
              <p className="mt-3 text-center text-[14px] text-muted-foreground">
                O teu parceiro(a) convidou-te. Entra com Google ou cria uma conta com email.
              </p>
              <div className="mt-8 space-y-4">
                <GoogleSignInButton
                  onClick={handleGoogleJoin}
                  loading={googleLoading}
                  disabled={googleLoading}
                />
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[13px] text-muted-foreground">ou</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <form onSubmit={handleRegister} className="space-y-3">
                  <AuthInput
                    label="O seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="given-name"
                  />
                  <AuthInput
                    label="O seu email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <AuthInput
                    label="Palavra-passe"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <div className="pt-2">
                    <PrimaryButton type="submit" loading={submitting}>
                      Aceitar convite
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* STEP: form — registo novo */}
          {step === "form" && (
            <>
              <p className="text-center text-[13px] text-muted-foreground">Passo 1 de 2</p>
              <h2 className="mt-1 text-center font-display text-[24px] leading-tight text-foreground">
                Os seus dados
              </h2>
              <form onSubmit={handleRegister} className="mt-7 space-y-3">
                <AuthInput
                  label="O seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                />
                <AuthInput
                  label="O seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <AuthInput
                  label="Palavra-passe"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <div className="pt-4">
                  <PrimaryButton type="submit" loading={submitting}>
                    Continuar
                  </PrimaryButton>
                </div>
              </form>
              <Link
                to="/login"
                className="mt-6 block w-full text-center text-[14px] text-muted-foreground"
              >
                Já tem conta? <span className="font-semibold text-accent">Entrar →</span>
              </Link>
            </>
          )}

          {/* STEP: invite — enviar convite por email */}
          {step === "invite" && (
            <>
              <p className="text-center text-[13px] text-muted-foreground">Passo 2 de 2</p>
              <h2 className="mt-1 text-center font-display text-[24px] leading-tight text-foreground">
                Convide o(a) parceiro(a)
              </h2>
              <p className="mt-3 text-center text-[14px] text-muted-foreground">
                O Duetto foi pensado a dois. Envie-lhe um convite para criarem juntos o vosso espaço financeiro.
              </p>
              <form onSubmit={handleInvite} className="mt-7 space-y-3">
                <AuthInput
                  label="Email do(a) parceiro(a)"
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                />
                <div className="pt-4">
                  <PrimaryButton type="submit" loading={submitting}>
                    Enviar convite
                  </PrimaryButton>
                </div>
              </form>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-4 block w-full text-center text-[13px] text-muted-foreground hover:text-foreground"
              >
                Convidar mais tarde
              </button>
            </>
          )}

          {/* STEP: waiting — a aguardar aceitação */}
          {step === "waiting" && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
                <Mail size={30} className="text-accent" />
                <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check size={14} strokeWidth={3} />
                </span>
              </div>
              <h2 className="mt-6 font-display text-[24px] leading-tight text-foreground">
                Convite pronto
              </h2>
              <p className="mt-3 max-w-[320px] text-[14px] leading-relaxed text-muted-foreground">
                Partilha este link com o(a) teu(tua) parceiro(a) para se juntarem ao Duetto.
              </p>
              <div className="mt-6 w-full rounded-2xl border border-border bg-background-soft/60 px-5 py-4 text-left">
                <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Link de convite</p>
                <p className="mt-1 break-all text-[13px] font-medium text-accent">
                  {window.location.origin}/register?invite={coupleId}
                </p>
              </div>
              <div className="mt-4 w-full rounded-2xl border border-border bg-background-soft/60 px-5 py-4 text-left">
                <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Enviado para</p>
                <p className="mt-1 text-[15px] font-medium text-foreground">{partnerEmail}</p>
                <div className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                  A aguardar aceitação...
                </div>
              </div>
              <div className="mt-8 w-full">
                <PrimaryButton onClick={() => navigate("/dashboard")}>
                  Continuar para o painel
                </PrimaryButton>
              </div>
            </div>
          )}

        </section>
      </div>
    </main>
  );
};

export default Register;
