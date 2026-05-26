import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/duetto/AppShell";
import { ProgressBar } from "@/components/duetto/ProgressBar";
import { CATEGORIES, formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
 
const INCOME_CATEGORIES = [
  { id: "trabalho", label: "Trabalho", emoji: "💼" },
  { id: "renda", label: "Renda", emoji: "🏠" },
  { id: "freelance", label: "Freelance", emoji: "💻" },
  { id: "investimento", label: "Investimento", emoji: "📈" },
  { id: "presente", label: "Presente", emoji: "🎁" },
  { id: "reembolso", label: "Reembolso", emoji: "↩️" },
  { id: "bonus", label: "Bónus", emoji: "⭐" },
  { id: "outro", label: "Outro", emoji: "📦" },
];
 
const ALL_CATEGORIES = [...CATEGORIES, ...INCOME_CATEGORIES];
 
const CHART_COLORS = [
  "#C8A96E", "#1A1A2E", "#4A6FA5", "#E8A87C",
  "#6B8F71", "#D4A5A5", "#9B8EA8", "#7FADA0",
];
 
const Dashboard = () => {
  const navigate = useNavigate();
  const { couple, transactions, goals } = useDuetto();
  const [showTypeModal, setShowTypeModal] = useState(false);

  useSubscriptionGuard();
 
  // Quando vem do AuthCallback com ?reload=1, faz reload completo da página
  // para garantir que o DuettoProvider carrega os dados frescos (casal ligado)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reload") === "1") {
      window.history.replaceState({}, "", "/dashboard");
      window.location.reload();
    }
  }, []);
 
  const now = new Date();
 
  const monthTransactions = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }),
    [transactions],
  );
 
  const monthExpenses = useMemo(
    () => monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );
 
  const monthIncome = useMemo(
    () => monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );
 
  const balance = monthIncome - monthExpenses;
  const primaryGoal = goals[0];
  const recent = transactions.slice(0, 5);
 
  const categoryData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
 
    return Object.entries(expensesByCategory)
      .map(([id, amount]) => ({
        id,
        label: ALL_CATEGORIES.find((c) => c.id === id)?.label || id,
        emoji: ALL_CATEGORIES.find((c) => c.id === id)?.emoji || "📦",
        amount,
        pct: monthExpenses > 0 ? (amount / monthExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, monthExpenses]);
 
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
              <p className="mt-0.5 font-medium">{formatEUR(monthIncome)}</p>
            </div>
            <div className="h-8 w-px bg-primary-foreground/20" />
            <div>
              <p className="text-primary-foreground/60">Despesas</p>
              <p className="mt-0.5 font-medium">{formatEUR(monthExpenses)}</p>
            </div>
          </div>
        </div>
      </section>
 
      {categoryData.length > 0 && (
        <section className="px-6 pt-6">
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-4">
              Despesas por categoria
            </p>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {categoryData.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    width: `${c.pct}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {categoryData.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-[13px] text-foreground">
                      {c.emoji} {c.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-muted-foreground">{Math.round(c.pct)}%</span>
                    <span className="text-[13px] font-medium text-foreground">{formatEUR(c.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
 
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
 
      <section className="px-6 pt-7 pb-[120px]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[20px] text-foreground">Últimas transações</h2>
          <Link to="/expenses" className="text-[13px] text-accent">Ver tudo</Link>
        </div>
        <ul className="mt-4 space-y-2">
          {recent.length === 0 && (
            <li className="py-8 text-center text-[14px] text-muted-foreground">
              Ainda não há transações este mês.
            </li>
          )}
          {recent.map((t) => {
            const cat = ALL_CATEGORIES.find((c) => c.id === t.category) ?? CATEGORIES[CATEGORIES.length - 1];
            const who = t.paidBy === "me" ? couple.me.name : couple.partner.name;
            const isIncome = t.type === "income";
            return (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-soft text-xl">
                  {cat.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-foreground">
                    {t.note || cat.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {cat.label} · {isIncome ? "Recebido por" : "Pago por"} {who}
                  </p>
                </div>
                <p className={`text-[15px] font-semibold ${isIncome ? "text-green-600" : "text-foreground"}`}>
                  {isIncome ? "+" : "-"}{formatEUR(t.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
 
      <button
        onClick={() => setShowTypeModal(true)}
        aria-label="Adicionar transação"
        className={`fab-add-transaction shimmer-cta press-scale flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground${transactions.length === 0 ? " fab-add-transaction--pulse" : ""}`}
      >
        <Plus size={26} strokeWidth={2.2} className="relative z-10" />
      </button>
 
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] rounded-t-[32px] bg-card px-6 pt-5 pb-10 shadow-card-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-[22px] text-foreground">O que queres registar?</h2>
              <button
                onClick={() => setShowTypeModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowTypeModal(false); navigate("/add-expense?type=expense"); }}
                className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card py-6 transition-all hover:border-accent hover:shadow-gold"
              >
                <span className="text-4xl">💸</span>
                <div className="text-center">
                  <p className="text-[16px] font-medium text-foreground">Despesa</p>
                  <p className="text-[12px] text-muted-foreground">O que gastaram</p>
                </div>
              </button>
              <button
                onClick={() => { setShowTypeModal(false); navigate("/add-expense?type=income"); }}
                className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card py-6 transition-all hover:border-accent hover:shadow-gold"
              >
                <span className="text-4xl">💰</span>
                <div className="text-center">
                  <p className="text-[16px] font-medium text-foreground">Receita</p>
                  <p className="text-[12px] text-muted-foreground">O que receberam</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
 
export default Dashboard;
 