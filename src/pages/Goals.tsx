import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/duetto/AppShell";
import { ProgressBar } from "@/components/duetto/ProgressBar";
import { PrimaryButton } from "@/components/duetto/PrimaryButton";
import { AuthInput } from "@/components/duetto/AuthInput";
import { formatEUR, useDuetto } from "@/hooks/useDuettoData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMOJIS = ["✈️", "🏡", "🚗", "💍", "🍼", "🎓", "🛟", "🎁"];

const Goals = () => {
  const { goals, addGoal } = useDuetto();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [emoji, setEmoji] = useState("✈️");

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const t = parseFloat(target.replace(",", "."));
    if (!name || !t || !deadline) {
      toast.error("Preencha todos os campos.");
      return;
    }
    addGoal({ name, target: t, deadline: new Date(deadline).toISOString(), emoji });
    toast.success("Meta criada.");
    setOpen(false);
    setName(""); setTarget(""); setDeadline(""); setEmoji("✈️");
  };

  return (
    <AppShell>
      <header className="flex items-start justify-between px-6 pt-10 pb-4">
        <div>
          <p className="text-[13px] text-muted-foreground">Os vossos sonhos</p>
          <h1 className="mt-1 font-display text-[26px] text-foreground">Metas</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Criar meta"
          className="press-scale flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="px-6">
        {goals.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <span className="text-5xl">🌱</span>
            <p className="mt-4 max-w-[280px] text-[15px] text-muted-foreground">
              Ainda não têm metas definidas. Criem a primeira juntos.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-6 text-[14px] font-semibold text-accent"
            >
              Criar primeira meta →
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => {
              const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
              return (
                <li key={g.id} className="rounded-3xl bg-card p-5 shadow-soft">
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
                    <p className="text-[13px] font-semibold text-accent">{Math.round(pct)}%</p>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[430px] animate-card-rise rounded-t-[32px] bg-card px-6 pt-5 pb-8 shadow-card-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[22px] text-foreground">Nova meta</h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-background-soft">
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
    </AppShell>
  );
};

export default Goals;