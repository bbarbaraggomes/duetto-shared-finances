import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/duetto/AppShell";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";
import { AuthInput } from "@/components/duetto/AuthInput";
import { CATEGORIES, Category, PaidBy, useDuetto } from "@/hooks/useDuettoData";
import { cn } from "@/lib/utils";

const AddExpense = () => {
  const navigate = useNavigate();
  const { addTransaction, couple } = useDuetto();
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState<Category>("mercado");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<PaidBy>("me");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const pressKey = (k: string) => {
    setAmount((prev) => {
      if (k === "back") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (k === ",") return prev.includes(",") ? prev : prev + ",";
      if (prev === "0") return k;
      return prev + k;
    });
  };

  const numeric = parseFloat(amount.replace(",", ".")) || 0;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (numeric <= 0) {
      toast.error("Indique um valor válido.");
      return;
    }
    addTransaction({
      amount: numeric,
      category,
      note: note || undefined,
      paidBy,
      date: new Date(date).toISOString(),
    });
    toast.success("Despesa guardada.");
    navigate("/dashboard");
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"];

  return (
    <AppShell hideNav>
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-[20px] text-foreground">Nova despesa</h1>
        <span className="w-10" />
      </header>

      <form onSubmit={handleSave} className="flex flex-1 flex-col px-6">
        <div className="flex flex-col items-center py-8">
          <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Valor</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-[56px] leading-none text-foreground">
              {amount.replace(".", ",")}
            </span>
            <span className="font-display text-[28px] text-muted-foreground">€</span>
          </div>
        </div>

        <div>
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Categoria</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-card px-1 py-3 transition-all press-scale",
                    active ? "border-accent shadow-gold" : "border-border",
                  )}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className={cn("text-[11px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <AuthInput label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="mt-4">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Pago por</p>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-background-soft p-1">
            {(["me", "partner"] as PaidBy[]).map((p) => {
              const active = paidBy === p;
              const label = p === "me" ? couple.me.name : couple.partner.name;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaidBy(p)}
                  className={cn(
                    "rounded-xl py-2.5 text-[14px] font-medium transition-all",
                    active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Data</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border-[1.5px] border-border bg-card px-4 text-[15px] text-foreground outline-none focus:border-accent"
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pressKey(k)}
              className="press-scale rounded-2xl bg-card py-3 font-display text-[22px] text-foreground shadow-soft"
            >
              {k === "back" ? "⌫" : k}
            </button>
          ))}
        </div>

        <div className="mt-6 pb-6">
          <PrimaryButton type="submit">Guardar despesa</PrimaryButton>
        </div>
      </form>
    </AppShell>
  );
};

export default AddExpense;