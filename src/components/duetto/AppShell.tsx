import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) => (
  <main className="min-h-[100dvh] bg-warm-gradient">
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col pb-24">
      {children}
    </div>
    {!hideNav && <BottomNav />}
  </main>
);
