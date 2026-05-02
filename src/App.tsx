import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DuettoProvider } from "@/hooks/useDuettoData";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AddExpense from "./pages/AddExpense.tsx";
import Expenses from "./pages/Expenses.tsx";
import Goals from "./pages/Goals.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCoupleId = searchParams.get("join");

  useEffect(() => {
    const hash = window.location.hash;

    const processJoin = async (userId: string) => {
      const joinId = joinCoupleId || localStorage.getItem("duetto_join_couple");
      if (!joinId) return;

      // Verifica se o utilizador já tem casal
      const { data: existingCouple } = await supabase
        .from("couples")
        .select("id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .maybeSingle();

      if (existingCouple) {
        // Já tem casal — não faz nada
        localStorage.removeItem("duetto_join_couple");
        return;
      }

      // Liga ao casal do convite
      const { error } = await supabase
        .from("couples")
        .update({ user2_id: userId, status: "active" })
        .eq("id", joinId)
        .is("user2_id", null); // só actualiza se ainda não tem parceiro

      if (error) {
        console.error("Erro ao ligar ao casal:", error);
      } else {
        console.log("✅ Parceiro ligado ao casal:", joinId);
        localStorage.removeItem("duetto_join_couple");
      }
    };

    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(async ({ data, error }) => {
          if (data?.session?.user) {
            await processJoin(data.session.user.id);
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/login", { replace: true });
          }
        });
      }
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await processJoin(session.user.id);
          subscription.unsubscribe();
          navigate("/dashboard", { replace: true });
        }
      });

      setTimeout(() => {
        subscription.unsubscribe();
        navigate("/login", { replace: true });
      }, 5000);
    }
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ fontFamily: "DM Sans", color: "#1A1A2E", fontSize: "18px" }}>A entrar no Duetto...</p>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DuettoProvider>
        <BrowserRouter></BrowserRouter>