import { AppShell } from "@/components/duetto/AppShell";
import { CATEGORIES, formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

const Expenses = () => {
  const { transactions, couple } = useDuetto();

  // Group by day
  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, t) => {
    const d = new Date(t.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long" });
    (acc[d] ||= []).push(t);
    return acc;
  }, {});

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-[13px] text-muted-foreground">As vossas despesas</p>
        <h1 className="mt-1 font-display text-[26px] text-foreground">Despesas</h1>
      </header>

      <div className="px-6">
        {Object.entries(grouped).map(([day, list]) => (
          <div key={day} className="mb-6">
            <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">{day}</p>
            <ul className="space-y-2">
              {list.map((t) => {
                const cat = CATEGORIES.find((c) => c.id === t.category)!;
                const who = t.paidBy === "me" ? couple.me.name : couple.partner.name;
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-soft text-xl">
                      {cat.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-foreground">{t.note || cat.label}</p>
                      <p className="text-[12px] text-muted-foreground">{cat.label} · {who}</p>
                    </div>
                    <p className="text-[15px] font-semibold text-foreground">−{formatEUR(t.amount)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <Link
        to="/add-expense"
        aria-label="Adicionar despesa"
        className="shimmer-cta press-scale fixed bottom-24 right-[calc(50%-200px)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold"
      >
        <Plus size={26} strokeWidth={2.2} className="relative z-10" />
      </Link>
    </AppShell>
  );
};

export default Expenses;
