import { useState, useEffect } from "react";
import { AppShell } from "@/components/duetto/AppShell";
import { ALL_CATEGORIES, DEFAULT_CATEGORIES, ALL_INCOME_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { useDuetto } from "@/hooks/useDuettoData";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TabType = "expense" | "income";

const CategorySetup = () => {
  const navigate = useNavigate();
  const { coupleId } = useDuetto();
  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [selectedIncomeIds, setSelectedIncomeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
      setSelectedExpenseIds((data as any).categories);
    }
    if ((data as any)?.income_categories) {
      setSelectedIncomeIds((data as any).income_categories);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const selectedIds = activeTab === "expense" ? selectedExpenseIds : selectedIncomeIds;
    const setSelected = activeTab === "expense" ? setSelectedExpenseIds : setSelectedIncomeIds;

    if (selectedIds.includes(categoryId)) {
      setSelected(prev => prev.filter(id => id !== categoryId));
    } else if (selectedIds.length < 8) {
      setSelected(prev => [...prev, categoryId]);
    } else {
      toast.error("Podem escolher no máximo 8 categorias");
    }
  };

  const handleSave = async () => {
    if (!coupleId) {
      toast.error("Erro ao guardar categorias. Tenta novamente.");
      return;
    }
    if (selectedExpenseIds.length === 0 && selectedIncomeIds.length === 0) {
      toast.error("Selecionem pelo menos 1 categoria");
      return;
    }

    console.log('Supabase URL:', supabase.auth.getSession());
    console.log('A guardar categorias:', { coupleId, selectedExpenseIds, selectedIncomeIds });

    setSaving(true);
    const { error } = await supabase
      .from('couple_categories' as any)
      .upsert({
        couple_id: coupleId,
        categories: selectedExpenseIds,
        income_categories: selectedIncomeIds,
        updated_at: new Date().toISOString()
      }, { onConflict: 'couple_id' });

    if (error) {
      console.error('Erro detalhado:', JSON.stringify(error));
      toast.error("Erro ao guardar categorias. Tenta novamente.");
      setSaving(false);
      return;
    }

    toast.success("Categorias guardadas! ✨");
    setSaving(false);
    navigate(-1);
  };

  const handleUseDefault = () => {
    if (activeTab === "expense") {
      setSelectedExpenseIds(DEFAULT_CATEGORIES.map(c => c.id));
    } else {
      setSelectedIncomeIds(DEFAULT_INCOME_CATEGORIES.map(c => c.id));
    }
  };

  const activeCategories = activeTab === "expense" ? ALL_CATEGORIES : ALL_INCOME_CATEGORIES;
  const selectedIds = activeTab === "expense" ? selectedExpenseIds : selectedIncomeIds;

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
        <h1 className="font-display text-[26px] text-foreground">Escolham as vossas categorias</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Personalizem o Duetto ao vosso estilo de vida</p>
      </header>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("expense")}
            className={cn(
              "pb-2 text-[15px] font-medium transition-colors relative",
              activeTab === "expense" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Despesas
            {activeTab === "expense" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#C8A96E]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={cn(
              "pb-2 text-[15px] font-medium transition-colors relative",
              activeTab === "income" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Receitas
            {activeTab === "income" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#C8A96E]" />
            )}
          </button>
        </div>
      </div>

      <div className="px-6 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-foreground">
            {activeTab === "expense" 
              ? `${selectedExpenseIds.length}/8 despesas` 
              : `${selectedIncomeIds.length}/8 receitas`}
          </p>
          <button
            onClick={handleUseDefault}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Usar padrão
          </button>
        </div>
      </div>

      <div className="px-6 pb-[100px]">
        <div className="grid grid-cols-4 gap-3">
          {activeCategories.map((cat) => {
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

      <div className="sticky bottom-[80px] left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4 z-10">
        <button
          onClick={handleSave}
          disabled={saving || (selectedExpenseIds.length === 0 && selectedIncomeIds.length === 0)}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </AppShell>
  );
};

export default CategorySetup;
