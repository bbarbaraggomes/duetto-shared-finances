import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/duetto/AppShell";
import { ProgressBar } from "@/components/duetto/ProgressBar";
import { CATEGORIES, formatEUR, useDuetto } from "@/hooks/useDuettoData";

const Dashboard = () => {
  const { couple, transactions, goals } = useDuetto();

  const now = new Date();
  const monthExpenses = useMemo(
    () =>
      transactions
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const balance = couple.monthIncome - monthExpenses;
  const primaryGoal = goals[0];
  const recent = transactions.slice(0, 5);

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-6">
        <p className="text-[13px] text-muted-foreground">
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-tight text-foreground">
          Olá, {couple.me.name}
          {couple.partner && !couple.partner.pending && <> e {couple.partner.name}</>}
        </h1>
      </header>

      <section className="px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground shadow-soft">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full blur-3xl"
            style={{ background: "hsl(var(--accent) / 0.35)" }}
          />
          <p className="text-[12px] uppercase tracking-[0.15em] text-primary-foreground/60">
            Saldo deste mês
          </p>
          <p className="mt-2 font-display text-[40px] leading-none">{formatEUR(balance)}</p>
          <div className="mt-5 flex items-center gap-6 text-[13px]">
            <div>
              <p className="text-primary-foreground/60">Receitas</p>
              <p className="mt-0.5 font-medium">{formatEUR(couple.monthIncome)}</p>
            </div>
            <div className="h-8 w-px bg-primary-foreground/20" />
            <div>
              <p className="text-primary-foreground/60">Despesas</p>
              <p className="mt-0.5 font-medium">{formatEUR(monthExpenses)}</p>
            </div>
          </div>
        </div>
      </section>

      {primaryGoal && (
        <section className="px-6 pt-6">
          <Link
            to="/goals"
            className="block rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-gold"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{primaryGoal.emoji}</span>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Meta principal</p>
                  <p className="font-display text-[18px] text-foreground">{primaryGoal.name}</p>
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {Math.round((primaryGoal.current / primaryGoal.target) * 100)}%
              </p>
            </div>
            <ProgressBar className="mt-4" value={(primaryGoal.current / primaryGoal.target) * 100} />
            <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
              <span>{formatEUR(primaryGoal.current)}</span>
              <span>{formatEUR(primaryGoal.target)}</span>
            </div>
          </Link>
        </section>
      )}

      <section className="px-6 pt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[20px] text-foreground">Últimas transações</h2>
          <Link to="/expenses" className="text-[13px] text-accent">Ver tudo</Link>
        </div>
        <ul className="mt-4 space-y-2">
          {recent.map((t) => {
            const cat = CATEGORIES.find((c) => c.id === t.category)!;
            const who = t.paidBy === "me" ? couple.me.name : couple.partner.name;
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-soft text-xl">
                  {cat.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-foreground">
                    {t.note || cat.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {cat.label} · Pago por {who}
                  </p>
                </div>
                <p className="text-[15px] font-semibold text-foreground">
                  −{formatEUR(t.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <Link
        to="/add-expense"
        aria-label="Adicionar despesa"
        className="shimmer-cta press-scale fixed bottom-24 left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold"
        style={{ marginLeft: "120px" }}
      >
        <Plus size={26} strokeWidth={2.2} className="relative z-10" />
      </Link>
    </AppShell>
  );
};

export default Dashboard;
