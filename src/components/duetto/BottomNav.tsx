import { NavLink } from "react-router-dom";
import { Home, Receipt, Target, BarChart2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Início", Icon: Home },
  { to: "/expenses", label: "Transações", Icon: Receipt },
  { to: "/goals", label: "Metas", Icon: Target },
  { to: "/finances", label: "Finanças", Icon: BarChart2 },
  { to: "/profile", label: "Perfil", Icon: User },
];

export const BottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
    <div className="mx-auto flex max-w-[430px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors",
              isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className={cn(isActive && "font-semibold")}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);
