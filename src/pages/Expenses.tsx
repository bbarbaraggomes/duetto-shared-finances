import { useState } from "react";
import { AppShell } from "@/components/duetto/AppShell";
import { CATEGORIES, Transaction, formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const { transactions, setTransactions, couple } = useDuetto();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, t) => {
    const d = new Date(t.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long" });
    (acc[d] ||= []).push(t);
    return acc;
  }, {});

  const handleDelete = async () => {
    if (!selected) return;
    const { error } = await supabase.from("transactions").delete().eq("id", selected.id);
    if (error) {
      toast.error("Erro ao apagar.");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== selected.id));
    toast.success("Transação apagada.");
    setConfirmDelete(false);
    setSelected(null);
  };

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
                  <li
                    key={t.id}
                    onClick={() => { setSelected(t); setConfirmDelete(false); }}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft active:opacity-70 transition-opacity"
                  >
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

      {/* Modal de acções */}
      {selected && !confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] rounded-t-[32px] bg-card px-6 pt-5 pb-10 shadow-card-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-[20px] text-foreground">
                {selected.note || ALL_CATEGORIES.find(c => c.id === selected.category)?.label}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-6">
              {formatEUR(selected.amount)} · {new Date(selected.date).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-4 text-left transition-colors hover:bg-destructive/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                  <Trash2 size={18} />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-destructive">Apagar transação</p>
                  <p className="text-[12px] text-muted-foreground">Esta acção não pode ser desfeita</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de apagar */}
      {confirmDelete && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[360px] rounded-3xl bg-card p-6 shadow-card-up">
            <h3 className="font-display text-[20px] text-foreground">Apagar transação?</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Vais apagar <strong>{selected.note || ALL_CATEGORIES.find(c => c.id === selected.category)?.label}</strong> de {formatEUR(selected.amount)}. Esta acção não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setConfirmDelete(false); setSelected(null); }}
                className="flex-1 rounded-2xl bg-background-soft py-3 text-[14px] font-medium text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-destructive py-3 text-[14px] font-semibold text-destructive-foreground"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Expenses;