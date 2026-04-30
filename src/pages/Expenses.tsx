import { AppShell } from "@/components/duetto/AppShell";
import { CATEGORIES, formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

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

const Expenses = () => {
  const navigate = useNavigate();
  const { transactions, couple } = useDuetto();

  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, t) => {
    const d = new Date(t.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long" });
    (acc[d] ||= []).push(t);
    return acc;
  }, {});

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-[13px] text-muted-foreground">As vossas transações</p>
        <h1 className="mt-1 font-display text-[26px] text-foreground">Transações</h1>
      </header>

      <div className="px-6 pb-32">
        {Object.keys(grouped).length === 0 && (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <span className="text-5xl">💸</span>
            <p className="mt-4 text-[15px] text-muted-foreground">
              Ainda não há transações registadas.
            </p>
          </div>
        )}
        {Object.entries(grouped).map(([day, list]) => (
          <div key={day} className="mb-6">
            <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">{day}</p>
            <ul className="space-y-2">
              {list.map((t) => {
                const cat = ALL_CATEGORIES.find((c) => c.id === t.category) ?? CATEGORIES[CATEGORIES.length - 1];
                const who = t.paidBy === "me" ? couple.me.name : couple.partner.name;
                const isIncome = t.type === "income";
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-soft text-xl">
                      {cat.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-foreground">{t.note || cat.label}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {cat.label} · {isIncome ? "Recebido por" : "Pago por"} {who}
                      </p>
                    </div>
                    <p className={`text-[15px] font-semibold ${isIncome ? "text-green-600" : "text-foreground"}`}>
                      {isIncome ? "+" : "−"}{formatEUR(t.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/add-expense")}
        aria-label="Adicionar transação"
        className="shimmer-cta press-scale fixed bottom-24 right-[calc(50%-200px)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold"
      >
        <Plus size={26} strokeWidth={2.2} className="relative z-10" />
      </button>
    </AppShell>
  );
};

export default Expenses;