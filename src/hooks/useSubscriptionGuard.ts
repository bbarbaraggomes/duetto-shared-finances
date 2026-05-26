import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDuetto } from "@/hooks/useDuettoData";

/**
 * Bloqueia ecrãs principais quando o utilizador está sem subscrição activa
 * e o trial já expirou.
 */
export const useSubscriptionGuard = () => {
  const navigate = useNavigate();
  const { couple, loading } = useDuetto();

  useEffect(() => {
    if (loading) return;

    const sub = couple.subscription;
    const isActive = sub.status === "active";
    const isValidTrial = sub.status === "trial" && (sub.daysLeft ?? 0) > 0;

    if (!isActive && !isValidTrial) {
      navigate("/profile?upgrade=1", { replace: true });
    }
  }, [couple.subscription, loading, navigate]);
};

