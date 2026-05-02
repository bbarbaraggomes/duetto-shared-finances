import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get("state") || localStorage.getItem("duetto_join_couple");

    const processJoin = async (userId: string) => {
      if (!joinId) return;

      const { data: existingCouple } = await supabase
        .from("couples")
        .select("id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .maybeSingle();

      if (existingCouple) {
        localStorage.removeItem("duetto_join_couple");
        return;
      }

      const { error } = await supabase
        .from("couples")
        .update({ user2_id: userId, status: "active" })
        .eq("id", joinId)
        .is("user2_id", null);

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
        }).then(async ({ data }) => {
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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Index />} />
            <Route path="/app" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-expense" element={<AddExpense />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/~oauth/initiate" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DuettoProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;