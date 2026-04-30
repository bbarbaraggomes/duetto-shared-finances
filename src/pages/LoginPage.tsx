import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DuettoLogo } from "@/components/duetto/DuettoLogo";
import { GoogleSignInButton } from "@/components/duetto/GoogleSignInButton";
import { AuthInput } from "@/components/duetto/AuthInput";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error("Não foi possível entrar com Google. Tente novamente.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha o email e a palavra-passe.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error("Credenciais inválidas. Verifique e tente novamente.");
      return;
    }
    toast.success("Bem-vindo de volta ao Duetto.");
    navigate("/dashboard");
  };

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-warm-gradient">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <section className="relative flex min-h-[40dvh] flex-col items-center justify-center px-6 pt-10 pb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-8 h-56 w-56 rounded-full blur-3xl"
            style={{ background: "hsl(var(--accent) / 0.35)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-10 top-20 h-40 w-40 rounded-full blur-3xl"
            style={{ background: "hsl(var(--accent) / 0.22)" }}
          />
          <div className="relative z-10 flex flex-col items-center animate-fade-in">
            <DuettoLogo size={48} />
            <h1 className="mt-4 font-display text-[32px] leading-none text-foreground">
              Duetto
            </h1>
            <p className="mt-3 text-[14px] text-muted-foreground">
              Finanças a dois, simples assim.
            </p>
          </div>
        </section>

        <section className="relative z-10 flex-1 animate-card-rise rounded-t-[32px] bg-card px-8 pt-8 pb-10 shadow-card-up">
          <p className="text-center text-[13px] text-muted-foreground">
            Bem-vindo de volta
          </p>
          <h2 className="mt-1 text-center font-display text-[26px] leading-tight text-foreground">
            Entre na sua conta
          </h2>

          <div className="mt-8 space-y-4">
            <GoogleSignInButton onClick={handleGoogle} loading={googleLoading} disabled={googleLoading} />

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[13px] text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <AuthInput
                label="O seu email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <AuthInput
                label="Palavra-passe"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-[13px] text-accent hover:underline underline-offset-4"
                >
                  Esqueceu a palavra-passe?
                </Link>
              </div>

              <div className="pt-3">
                <PrimaryButton type="submit" loading={submitting}>
                  Entrar
                </PrimaryButton>
              </div>
            </form>

            <Link
              to="/register"
              className="mt-5 block w-full py-2 text-center text-[14px] text-muted-foreground"
            >
              Ainda não tem conta?{" "}
              <span className="font-semibold text-accent">Criar conta juntos →</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;