import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, X, Pencil, Trash2, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/duetto/AppShell";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";
import { AuthInput } from "@/components/duetto/AuthInput";
import { Switch } from "@/components/ui/switch";
import { Category, formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { ALL_CATEGORIES, ALL_INCOME_CATEGORIES, DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const normalizeText = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const formatShort = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}€`;

const daysInMonth = (year: number, month1based: number) => new Date(year, month1based, 0).getDate();

interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  dayOfMonth: number;
  isEssential: boolean;
  isActive: boolean;
}

interface Confirmation {
  id: string;
  recurringId: string;
  month: number;
  year: number;
  confirmed: boolean;
  transactionId?: string | null;
}

const RecurringTransactions = () => {
  const navigate = useNavigate();
  const { coupleId, userId, setTransactions } = useDuetto();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [items, setItems] = useState<RecurringItem[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDay, setFormDay] = useState("1");
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formCategory, setFormCategory] = useState("casa");
  const [formEssential, setFormEssential] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<RecurringItem | null>(null);

  useEffect(() => {
    if (coupleId) loadData();
  }, [coupleId]);

  const loadData = async () => {
    if (!coupleId) return;
    setLoading(true);

    const { data: recData } = await supabase
      .from("recurring_transactions" as any)
      .select("*")
      .eq("couple_id", coupleId)
      .order("day_of_month", { ascending: true });

    if (recData) {
      setItems((recData as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        amount: Number(r.amount),
        type: (r.type as "expense" | "income") || "expense",
        category: r.category || "outros",
        dayOfMonth: r.day_of_month,
        isEssential: r.is_essential,
        isActive: r.is_active,
      })));
    }

    const { data: confData } = await supabase
      .from("recurring_confirmations" as any)
      .select("*")
      .eq("couple_id", coupleId)
      .eq("month", currentMonth)
      .eq("year", currentYear);

    if (confData) {
      setConfirmations((confData as any[]).map((c) => ({
        id: c.id,
        recurringId: c.recurring_id,
        month: c.month,
        year: c.year,
        confirmed: c.confirmed,
        transactionId: c.transaction_id,
      })));
    }

    setLoading(false);
  };

  const isConfirmed = (id: string) => confirmations.find((c) => c.recurringId === id)?.confirmed ?? false;

  const getCategoryMeta = (item: RecurringItem) => {
    const list = item.type === "income" ? ALL_INCOME_CATEGORIES : ALL_CATEGORIES;
    return list.find((c) => c.id === item.category) ?? { id: "outros", label: "Outros", emoji: "📦" };
  };

  const activeItems = items.filter((i) => i.isActive);
  const totalEssential = activeItems.filter((i) => i.isEssential).reduce((s, i) => s + i.amount, 0);
  const totalNonEssential = activeItems.filter((i) => !i.isEssential).reduce((s, i) => s + i.amount, 0);
  const totalFixed = totalEssential + totalNonEssential;

  const handleConfirmPayment = async (item: RecurringItem) => {
    if (!coupleId || !userId) return;

    const day = Math.min(item.dayOfMonth, daysInMonth(currentYear, currentMonth));
    const txDate = new Date(currentYear, currentMonth - 1, day);
    const isoDate = txDate.toISOString();
    const newTxId = crypto.randomUUID();

    const { error: txError } = await supabase.from("transactions").insert({
      id: newTxId,
      couple_id: coupleId,
      user_id: userId,
      amount: item.amount,
      type: item.type,
      category: item.category,
      description: item.name,
      date: isoDate.split("T")[0],
    });
    if (txError) {
      toast.error("Erro ao registar transação.");
      return;
    }

    const { data: confData, error: confError } = await supabase
      .from("recurring_confirmations" as any)
      .upsert(
        {
          recurring_id: item.id,
          couple_id: coupleId,
          month: currentMonth,
          year: currentYear,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          transaction_id: newTxId,
        },
        { onConflict: "recurring_id,month,year" },
      )
      .select()
      .single();

    if (confError) {
      toast.error("Erro ao confirmar pagamento.");
      return;
    }

    setTransactions((prev) => [
      {
        id: newTxId,
        amount: item.amount,
        category: item.category as Category,
        note: item.name,
        paidBy: "me",
        date: isoDate,
        type: item.type,
      },
      ...prev,
    ]);

    const row = confData as any;
    setConfirmations((prev) => [
      ...prev.filter((c) => c.recurringId !== item.id),
      { id: row.id, recurringId: row.recurring_id, month: row.month, year: row.year, confirmed: row.confirmed, transactionId: row.transaction_id },
    ]);

    toast.success(`${item.name} de ${formatShort(item.amount)} registada! ✓`);
  };

  const handleToggleActive = async (item: RecurringItem) => {
    const newActive = !item.isActive;
    const { error } = await supabase
      .from("recurring_transactions" as any)
      .update({ is_active: newActive })
      .eq("id", item.id);
    if (error) {
      toast.error("Erro ao atualizar.");
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: newActive } : i)));
  };

  const openNewForm = () => {
    setEditing(null);
    setFormName("");
    setFormAmount("");
    setFormDay("1");
    setFormType("expense");
    setFormCategory(DEFAULT_CATEGORIES[0]?.id || "casa");
    setFormEssential(true);
    setCategorySearch("");
    setShowForm(true);
  };

  const openEditForm = (item: RecurringItem) => {
    setEditing(item);
    setFormName(item.name);
    setFormAmount(String(item.amount));
    setFormDay(String(item.dayOfMonth));
    setFormType(item.type);
    setFormCategory(item.category);
    setFormEssential(item.isEssential);
    setCategorySearch("");
    setShowForm(true);
  };

  const handleFormTypeChange = (t: "expense" | "income") => {
    setFormType(t);
    setCategorySearch("");
    const list = t === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_CATEGORIES;
    setFormCategory(list[0]?.id || "outros");
  };

  const categoryFullList = formType === "income" ? ALL_INCOME_CATEGORIES : ALL_CATEGORIES;
  const categoryDefaultList = formType === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_CATEGORIES;
  const categoryQuery = normalizeText(categorySearch.trim());
  const displayedFormCategories = categoryQuery
    ? categoryFullList.filter((c) => normalizeText(c.label).includes(categoryQuery))
    : categoryDefaultList;

  const handleSaveForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!coupleId) return;

    const amountNum = parseFloat(formAmount.replace(",", "."));
    const dayNum = parseInt(formDay, 10);

    if (!formName.trim()) { toast.error("Indique um nome."); return; }
    if (!amountNum || amountNum <= 0) { toast.error("Indique um valor válido."); return; }
    if (!dayNum || dayNum < 1 || dayNum > 31) { toast.error("Indique um dia entre 1 e 31."); return; }

    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("recurring_transactions" as any)
        .update({
          name: formName.trim(),
          amount: amountNum,
          type: formType,
          category: formCategory,
          day_of_month: dayNum,
          is_essential: formEssential,
        })
        .eq("id", editing.id);

      if (error) { toast.error("Erro ao guardar."); setSaving(false); return; }

      setItems((prev) => prev.map((i) => i.id === editing.id
        ? { ...i, name: formName.trim(), amount: amountNum, type: formType, category: formCategory, dayOfMonth: dayNum, isEssential: formEssential }
        : i));
      toast.success("Custo fixo atualizado.");
    } else {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from("recurring_transactions" as any).insert({
        id: newId,
        couple_id: coupleId,
        name: formName.trim(),
        amount: amountNum,
        type: formType,
        category: formCategory,
        day_of_month: dayNum,
        is_essential: formEssential,
        is_active: true,
      });

      if (error) { toast.error("Erro ao criar custo fixo."); setSaving(false); return; }

      setItems((prev) => [...prev, {
        id: newId, name: formName.trim(), amount: amountNum, type: formType,
        category: formCategory, dayOfMonth: dayNum, isEssential: formEssential, isActive: true,
      }]);
      toast.success("Custo fixo criado.");
    }

    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("recurring_transactions" as any).delete().eq("id", toDelete.id);
    if (error) { toast.error("Erro ao apagar."); return; }
    setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
    setConfirmations((prev) => prev.filter((c) => c.recurringId !== toDelete.id));
    toast.success("Custo fixo apagado.");
    setToDelete(null);
  };

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={20} />
          <span className="text-[14px]">Voltar</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">Gestão mensal</p>
            <h1 className="mt-1 font-display text-[26px] text-foreground">Custos Fixos</h1>
          </div>
          <button
            onClick={openNewForm}
            aria-label="Adicionar custo fixo"
            className="press-scale flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="px-6 mb-6">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card px-3 py-3 text-center shadow-soft">
            <p className="text-[11px] text-muted-foreground">Essenciais</p>
            <p className="mt-0.5 font-display text-[14px] font-semibold text-foreground">{formatEUR(totalEssential)}</p>
          </div>
          <div className="rounded-2xl bg-card px-3 py-3 text-center shadow-soft">
            <p className="text-[11px] text-muted-foreground">Não essenciais</p>
            <p className="mt-0.5 font-display text-[14px] font-semibold text-foreground">{formatEUR(totalNonEssential)}</p>
          </div>
          <div className="rounded-2xl bg-card px-3 py-3 text-center shadow-soft">
            <p className="text-[11px] text-muted-foreground">Total fixo/mês</p>
            <p className="mt-0.5 font-display text-[14px] font-semibold text-[#C8A96E]">{formatEUR(totalFixed)}</p>
          </div>
        </div>
      </div>

      {!loading && items.length === 0 && (
        <div className="mx-6 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <span className="text-5xl">📌</span>
          <p className="mt-4 text-[15px] text-muted-foreground">Ainda não têm custos fixos registados.</p>
          <button onClick={openNewForm} className="mt-6 text-[14px] font-semibold text-accent">
            Adicionar o primeiro →
          </button>
        </div>
      )}

      {activeItems.length > 0 && (
        <section className="px-6 mb-6">
          <h2 className="font-display text-[18px] text-foreground mb-3">A confirmar este mês</h2>
          <ul className="space-y-2">
            {activeItems.map((item) => {
              const confirmed = isConfirmed(item.id);
              const meta = getCategoryMeta(item);
              return (
                <li key={item.id} className="rounded-2xl bg-card px-4 py-3 shadow-soft">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-soft text-xl">
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-foreground">{item.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        Vence dia {item.dayOfMonth} · {formatEUR(item.amount)}
                      </p>
                    </div>
                    {confirmed ? (
                      <span className="flex items-center gap-1 text-[12px] font-medium text-[#C8A96E]">
                        <Check size={14} /> Confirmado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Pendente
                      </span>
                    )}
                  </div>
                  {!confirmed && (
                    <button
                      onClick={() => handleConfirmPayment(item)}
                      className="press-scale mt-3 w-full rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground"
                    >
                      Confirmar pagamento
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(["essential", "nonessential"] as const).map((group) => {
        const groupItems = items.filter((i) => (group === "essential" ? i.isEssential : !i.isEssential));
        if (groupItems.length === 0) return null;
        return (
          <section key={group} className="px-6 mb-6">
            <h2 className="font-display text-[18px] text-foreground mb-3">
              {group === "essential" ? "Essenciais" : "Não essenciais"}
            </h2>
            <ul className="space-y-2">
              {groupItems.map((item) => {
                const meta = getCategoryMeta(item);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-2xl border-[1.5px] bg-card px-4 py-3 shadow-soft transition-opacity",
                      item.isEssential ? "border-green-200" : "border-border",
                      !item.isActive && "opacity-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-soft text-xl">
                        {meta.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-foreground">{item.name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {formatEUR(item.amount)} · Todo dia {item.dayOfMonth}
                        </p>
                      </div>
                      <Switch checked={item.isActive} onCheckedChange={() => handleToggleActive(item)} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          item.isEssential ? "bg-green-100 text-green-700" : "bg-background-soft text-muted-foreground",
                        )}
                      >
                        {item.isEssential ? "Essencial" : "Não essencial"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(item)}
                          aria-label="Editar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-soft text-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setToDelete(item)}
                          aria-label="Apagar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Modal — criar/editar custo fixo */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto rounded-t-[32px] bg-card px-6 pt-5 pb-10 shadow-card-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[20px] text-foreground">
                {editing ? "Editar custo fixo" : "Novo custo fixo"}
              </h2>
              <button onClick={() => setShowForm(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="space-y-4">
              <AuthInput label="Nome" value={formName} onChange={(e) => setFormName(e.target.value)} />
              <AuthInput label="Valor (€)" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />

              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">Tipo</p>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-background-soft p-1">
                  <button
                    type="button"
                    onClick={() => handleFormTypeChange("expense")}
                    className={cn("rounded-xl py-2.5 text-[14px] font-medium transition-all", formType === "expense" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
                  >
                    💸 Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormTypeChange("income")}
                    className={cn("rounded-xl py-2.5 text-[14px] font-medium transition-all", formType === "income" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
                  >
                    💰 Receita
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">Dia do mês</p>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value)}
                  className="h-12 w-full rounded-2xl border-[1.5px] border-border bg-card px-4 text-[15px] text-foreground outline-none focus:border-accent"
                />
              </div>

              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">Categoria</p>
                <div className="relative mb-3">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C8A96E]" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Pesquisar categoria..."
                    className="h-11 w-full rounded-full border border-border bg-[#F7F6F3] pl-10 pr-4 text-[14px] text-[#1A1A2E] outline-none transition-colors focus:border-[#C8A96E] placeholder:text-muted-foreground"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {displayedFormCategories.map((c) => {
                    const active = formCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormCategory(c.id)}
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
                  {displayedFormCategories.length === 0 && (
                    <p className="col-span-4 py-4 text-center text-[13px] text-muted-foreground">
                      Nenhuma categoria encontrada
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">É essencial?</p>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-background-soft p-1">
                  <button
                    type="button"
                    onClick={() => setFormEssential(true)}
                    className={cn("rounded-xl py-2.5 text-[14px] font-medium transition-all", formEssential ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormEssential(false)}
                    className={cn("rounded-xl py-2.5 text-[14px] font-medium transition-all", !formEssential ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
                  >
                    Não
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <PrimaryButton type="submit" loading={saving}>
                  Guardar
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — confirmar apagar */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[360px] rounded-3xl bg-card p-6 shadow-card-up">
            <h3 className="font-display text-[20px] text-foreground">Apagar custo fixo?</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Vais apagar <strong>{toDelete.name}</strong> ({formatEUR(toDelete.amount)}/mês). Esta acção não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setToDelete(null)} className="flex-1 rounded-2xl bg-background-soft py-3 text-[14px] font-medium text-foreground">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 rounded-2xl bg-destructive py-3 text-[14px] font-semibold text-destructive-foreground">Apagar</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default RecurringTransactions;
