import { useState, useEffect } from "react";
import { AppShell } from "@/components/duetto/AppShell";
import { ALL_CATEGORIES, DEFAULT_CATEGORIES } from "@/lib/categories";
import { useDuetto } from "@/hooks/useDuettoData";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CategorySetup = () => {
  const navigate = useNavigate();
  const { coupleId } = useDuetto();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomCategories();
  }, [coupleId]);

  const loadCustomCategories = async () => {
    if (!coupleId) return;
    
    const { data, error } = await supabase
      .from("couple_categories" as any)
      .select("categories")
      .eq("couple_id", coupleId)
      .single();

    if ((data as any)?.categories) {
      setSelectedIds((data as any).categories);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      setSelectedIds(prev => prev.filter(id => id !== categoryId));
    } else if (selectedIds.length < 8) {
      setSelectedIds(prev => [...prev, categoryId]);
    } else {
      toast.error("Podem escolher no máximo 8 categorias");
    }
  };

  const handleSave = async () => {
    if (!coupleId) return;
    if (selectedIds.length === 0) {
      toast.error("Selecionem pelo menos 1 categoria");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("couple_categories" as any)
      .upsert({
        couple_id: coupleId,
        categories: selectedIds,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "couple_id"
      });

    if (error) {
      toast.error("Erro ao guardar categorias");
      setSaving(false);
      return;
    }

    toast.success("Categorias guardadas!");
    setSaving(false);
    navigate(-1);
  };

  const handleUseDefault = () => {
    setSelectedIds(DEFAULT_CATEGORIES.map(c => c.id));
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
        <h1 className="font-display text-[26px] text-foreground">Escolham as vossas 8 categorias</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Personalizem o Duetto ao vosso estilo de vida</p>
      </header>

      <div className="px-6 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-foreground">
            {selectedIds.length}/8 selecionadas
          </p>
          <button
            onClick={handleUseDefault}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Usar padrão
          </button>
        </div>
      </div>

      <div className="px-6 pb-[140px]">
        <div className="grid grid-cols-4 gap-3">
          {ALL_CATEGORIES.map((cat) => {
            const isSelected = selectedIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                  isSelected
                    ? "bg-[#C8A96E]/10 border-2 border-[#C8A96E]"
                    : "bg-card border-2 border-border hover:border-border/80"
                )}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className={cn(
                  "text-[11px] font-medium text-center leading-tight",
                  isSelected ? "text-[#1A1A2E]" : "text-muted-foreground"
                )}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4">
        <button
          onClick={handleSave}
          disabled={saving || selectedIds.length === 0}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </AppShell>
  );
};

export default CategorySetup;
