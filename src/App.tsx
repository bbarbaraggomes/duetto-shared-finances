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
    const run = async () => {
      const hash = window.location.hash;
      const joinId = localStorage.getItem("duetto_join_couple");

      console.log("AuthCallback joinId:", joinId);

      const processAuth = async (userId: string, email: string, metadata: any) => {
        await supabase.from("users").upsert({
          id: userId,
          email: email.toLowerCase().trim(),
          full_name: metadata?.full_name || metadata?.name || email.split("@")[0],
        }, { onConflict: "id", ignoreDuplicates: false });

        const { data: existing } = await supabase
          .from("couples")
          .select("id")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .maybeSingle();

        if (existing) {
          console.log("Ja tem casal:", existing.id);
          localStorage.removeItem("duetto_join_couple");
          return;
        }

        if (joinId) {
          console.log("A ligar ao casal:", joinId);
          const { error } = await supabase
            .from("couples")
            .update({ user2_id: userId, status: "active" })
            .eq("id", joinId)
            .is("user2_id", null);
          if (!error) console.log("Parceiro ligado ao casal:", joinId);
          localStorage.removeItem("duetto_join_couple");
          return;
        }

        console.log("A criar casal novo para:", userId);
        const { data: newCouple } = await supabase
          .from("couples")
          .insert({ user1_id: userId, status: "pending" })
          .select()
          .single();
        if (newCouple) {
          await supabase.from("subscriptions").insert({ couple_id: newCouple.id });
          console.log("Casal criado:", newCouple.id);
        }
      };

      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          const user = data?.session?.user;
          if (user) {
            await processAuth(user.id, user.email || "", user.user_metadata);
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/login", { replace: true });
          }
        }
        return;
      }

      const timeout = setTimeout(() => {
        localStorage.removeItem("duetto_join_couple");
        navigate("/login", { replace: true });
      }, 10000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
          clearTimeout(timeout);
          const user = session.user;
          await processAuth(user.id, user.email || "", user.user_metadata);
          subscription.unsubscribe();
          navigate("/dashboard", { replace: true });
        }
      });
    };

    run();
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: "12px", background: "#F7F6F3" }}>
      <p style={{ fontFamily: "DM Sans", color: "#1A1A2E", fontSize: "18px" }}>A entrar no Duetto...</p>
      <p style={{ fontFamily: "DM Sans", color: "#C8A96E", fontSize: "13px" }}>A preparar o vosso espaco financeiro</p>
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
