import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/duetto/AppShell";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";
import { AuthInput } from "@/components/duetto/AuthInput";
import { CATEGORIES, Category, PaidBy, useDuetto } from "@/hooks/useDuettoData";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { ALL_CATEGORIES, DEFAULT_CATEGORIES, ALL_INCOME_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

const AddExpense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") === "income" ? "income" : "expense";

  const { addTransaction, couple, coupleId } = useDuetto();
  useSubscriptionGuard();
  const [type, setType] = useState<"expense" | "income">(initialType);
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState<string>(initialType === "income" ? "trabalho" : "mercado");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<PaidBy>("me");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const amountContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCustomCategories();
  }, [coupleId]);

  const loadCustomCategories = async () => {
    if (!coupleId) return;
    
    const { data } = await supabase
      .from("couple_categories" as any)
      .select("categories, income_categories")
      .eq("couple_id", coupleId)
      .single();

    if ((data as any)?.categories) {
      setCustomExpenseCategories((data as any).categories);
    }
    if ((data as any)?.income_categories) {
      setCustomIncomeCategories((data as any).income_categories);
    }
  };

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (target !== amountInputRef.current) return;
      amountInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  const isIncome = type === "income";
  const activeCategories = isIncome 
    ? (customIncomeCategories.length > 0 
        ? ALL_INCOME_CATEGORIES.filter(c => customIncomeCategories.includes(c.id))
        : DEFAULT_INCOME_CATEGORIES)
    : (customExpenseCategories.length > 0 
        ? ALL_CATEGORIES.filter(c => customExpenseCategories.includes(c.id))
        : DEFAULT_CATEGORIES);

  const handleTypeChange = (t: "expense" | "income") => {
    setType(t);
    const newCategories = t === "income" 
      ? (customIncomeCategories.length > 0 
          ? ALL_INCOME_CATEGORIES.filter(c => customIncomeCategories.includes(c.id))
          : DEFAULT_INCOME_CATEGORIES)
      : (customExpenseCategories.length > 0 
          ? ALL_CATEGORIES.filter(c => customExpenseCategories.includes(c.id))
          : DEFAULT_CATEGORIES);
    setCategory(newCategories[0]?.id || (t === "income" ? "salario" : "casa"));
  };

  const pressKey = (k: string) => {
    setAmount((prev) => {
      if (k === "back") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (k === ",") return prev.includes(",") ? prev : prev + ",";
      if (prev === "0") return k;
      return prev + k;
    });
  };

  const handleAmountInput = (value: string) => {
    const sanitized = value.replace(/[^\d,]/g, "");
    const parts = sanitized.split(",");
    const normalized =
      parts.length > 2 ? `${parts[0]},${parts.slice(1).join("")}` : sanitized;
    if (!normalized || normalized === ",") {
      setAmount("0");
      return;
    }
    setAmount(normalized.startsWith(",") ? `0${normalized}` : normalized);
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
      category: category as Category,
      note: note || undefined,
      paidBy,
      date: new Date(date).toISOString(),
      type,
    });
    toast.success(isIncome ? "Receita guardada." : "Despesa guardada.");
    navigate("/dashboard");
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"];

  return (
    <AppShell hideNav>
      <div className="add-expense-page flex flex-1 flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-[20px] text-foreground">
          {isIncome ? "Nova receita" : "Nova despesa"}
        </h1>
        <span className="w-10" />
      </header>

      {/* Toggle despesa / receita */}
      <div className="mx-6 mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-background-soft p-1">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={cn(
            "rounded-xl py-2.5 text-[14px] font-medium transition-all",
            !isIncome ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
          )}
        >
          💸 Despesa
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={cn(
            "rounded-xl py-2.5 text-[14px] font-medium transition-all",
            isIncome ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
          )}
        >
          💰 Receita
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-1 flex-col px-6">
        <div ref={amountContainerRef} className="scroll-mt-4">
          <div className="sticky top-0 z-10 bg-background pb-4 pt-2">
            <p className="text-center text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Valor</p>
            <div
              className="mt-3 flex cursor-text items-baseline justify-center gap-2"
              onClick={() => amountInputRef.current?.focus()}
            >
              <span className="font-display text-[56px] leading-none text-foreground">
                {amount.replace(".", ",")}
              </span>
              <span className="font-display text-[28px] text-muted-foreground">€</span>
            </div>
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

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Categoria</p>
            <button
              type="button"
              onClick={() => navigate("/category-setup")}
              className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings size={14} />
              <span>Personalizar</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {activeCategories.map((c) => {
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

        <div className="mt-4">
          <AuthInput label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="mt-4">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
            {isIncome ? "Recebido por" : "Pago por"}
          </p>
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

        <div className="mt-4 scroll-mt-4">
          <input
            ref={amountInputRef}
            id="amount-input"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            aria-label="Valor"
            value={amount === "0" ? "" : amount}
            onChange={(e) => handleAmountInput(e.target.value)}
            onFocus={() => amountInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="h-12 w-full rounded-2xl border-[1.5px] border-border bg-card px-4 text-center text-[18px] font-display text-foreground outline-none focus:border-accent"
            placeholder="0"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
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
          <PrimaryButton type="submit">
            {isIncome ? "Guardar receita" : "Guardar despesa"}
          </PrimaryButton>
        </div>
      </form>
      </div>
    </AppShell>
  );
};

export default AddExpense;