import { FormEvent, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { AppShell } from "@/components/duetto/AppShell";
import { ProgressBar } from "@/components/duetto/ProgressBar";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";
import { AuthInput } from "@/components/duetto/AuthInput";
import { Goal, formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { supabase } from "@/integrations/supabase/client";

const EMOJIS = ["✈️", "🏡", "🚗", "💍", "🍼", "🎓", "🛟", "🎁"];

const Goals = () => {
  const { goals, addGoal, setGoals } = useDuetto();

  useSubscriptionGuard();

  // Estado — criar meta
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [emoji, setEmoji] = useState("✈️");

  // Estado — abonar meta
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [abonarValue, setAbonarValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const t = parseFloat(target.replace(",", "."));
    if (!name || !t || !deadline) {
      toast.error("Preencha todos os campos.");
      return;
    }
    addGoal({ name, target: t, deadline: new Date(deadline).toISOString(), emoji });
    toast.success("Meta criada.");
    setOpenCreate(false);
    setName(""); setTarget(""); setDeadline(""); setEmoji("✈️");
  };

  const handleAbonar = async () => {
    if (!selectedGoal) return;
    const value = parseFloat(abonarValue.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Indique um valor válido.");
      return;
    }
    const newCurrent = selectedGoal.current + value;
    const { error } = await supabase
      .from("goals")
      .update({ current_amount: newCurrent })
      .eq("id", selectedGoal.id);

    if (error) {
      toast.error("Erro ao actualizar meta.");
      return;
    }

    setGoals(goals.map((g) =>
      g.id === selectedGoal.id ? { ...g, current: newCurrent } : g
    ));
    toast.success(`+${formatEUR(value)} adicionado à meta!`);
    setSelectedGoal(null);
    setAbonarValue("");
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    const { error } = await supabase.from("goals").delete().eq("id", selectedGoal.id);
    if (error) {
      toast.error("Erro ao apagar meta.");
      return;
    }
    setGoals(goals.filter((g) => g.id !== selectedGoal.id));
    toast.success("Meta apagada.");
    setSelectedGoal(null);
    setConfirmDelete(false);
  };

  return (
    <AppShell>
      <header className="flex items-start justify-between px-6 pt-10 pb-4">
        <div>
          <p className="text-[13px] text-muted-foreground">Os vossos sonhos</p>
          <h1 className="mt-1 font-display text-[26px] text-foreground">Metas</h1>
        </div>
        <button
          onClick={() => setOpenCreate(true)}
          aria-label="Criar meta"
          className="press-scale flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="px-6 pb-10">
        {goals.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <span className="text-5xl">🌱</span>
            <p className="mt-4 max-w-[280px] text-[15px] text-muted-foreground">
              Ainda não têm metas definidas. Criem a primeira juntos.
            </p>
            <button
              onClick={() => setOpenCreate(true)}
              className="mt-6 text-[14px] font-semibold text-accent"
            >
              Criar primeira meta →
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => {
              const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
              const complete = pct >= 100;
              return (
                <li
                  key={g.id}
                  onClick={() => { setSelectedGoal(g); setAbonarValue(""); setConfirmDelete(false); }}
                  className="cursor-pointer rounded-3xl bg-card p-5 shadow-soft active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <p className="font-display text-[18px] text-foreground">{g.name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          até {new Date(g.deadline).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <p className={cn("text-[13px] font-semibold", complete ? "text-green-600" : "text-accent")}>
                      {complete ? "✓ Concluída" : `${Math.round(pct)}%`}
                    </p>
                  </div>
                  <ProgressBar className="mt-4" value={pct} />
                  <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
                    <span>{formatEUR(g.current)}</span>
                    <span>{formatEUR(g.target)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal — criar meta */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] animate-card-rise rounded-t-[32px] bg-card px-6 pt-5 pb-8 shadow-card-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[22px] text-foreground">Nova meta</h2>
              <button onClick={() => setOpenCreate(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5 space-y-3">
              <AuthInput label="Nome da meta" value={name} onChange={(e) => setName(e.target.value)} />
              <AuthInput label="Valor alvo (€)" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">Data limite</p>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-14 w-full rounded-2xl border-[1.5px] border-border bg-card px-4 text-[15px] text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">Ícone</p>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      type="button"
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-xl border-[1.5px] text-xl",
                        emoji === e ? "border-accent bg-accent/10" : "border-border bg-card",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-3">
                <PrimaryButton type="submit">Criar meta</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — abonar meta */}
      {selectedGoal && !confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] rounded-t-[32px] bg-card px-6 pt-5 pb-10 shadow-card-up">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedGoal.emoji}</span>
                <h2 className="font-display text-[20px] text-foreground">{selectedGoal.name}</h2>
              </div>
              <button
                onClick={() => setSelectedGoal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[13px] text-muted-foreground mb-5">
              {formatEUR(selectedGoal.current)} de {formatEUR(selectedGoal.target)} · {Math.round(Math.min((selectedGoal.current / selectedGoal.target) * 100, 100))}%
            </p>

            <div className="space-y-3">
              <div>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">Valor a abonar (€)</p>
                <input
                  type="number"
                  value={abonarValue}
                  onChange={(e) => setAbonarValue(e.target.value)}
                  placeholder="0,00"
                  className="h-14 w-full rounded-2xl border-[1.5px] border-border bg-card px-4 text-[18px] font-display text-foreground outline-none focus:border-accent"
                />
              </div>
              <PrimaryButton type="button" onClick={handleAbonar}>
                Abonar à meta
              </PrimaryButton>
            </div>

            <button
              onClick={() => setConfirmDelete(true)}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-left transition-colors hover:bg-destructive/20"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <Trash2 size={16} />
              </div>
              <p className="text-[14px] font-medium text-destructive">Apagar meta</p>
            </button>
          </div>
        </div>
      )}

      {/* Confirmação apagar meta */}
      {confirmDelete && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[360px] rounded-3xl bg-card p-6 shadow-card-up">
            <h3 className="font-display text-[20px] text-foreground">Apagar meta?</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Vais apagar <strong>{selectedGoal.name}</strong>. Esta acção não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
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

export default Goals;