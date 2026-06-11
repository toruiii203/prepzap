import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";

interface StudeniusShellProps {
  children: ReactNode;
  /** Hide bottom nav on focused tool flows (e.g. focus timer) */
  hideNav?: boolean;
}

/**
 * Centers the Studenius mobile frame on desktop with cream canvas + ink borders.
 */
export function StudeniusShell({ children, hideNav = false }: StudeniusShellProps) {
  return (
    <div className="studenius-app min-h-[100dvh] w-full flex justify-center bg-[#2a2a2a]">
      <div className="relative w-full max-w-[390px] min-h-[100dvh] bg-[#FAF7F2] border-x-[1.5px] border-black shadow-[0_0_40px_rgba(0,0,0,0.2)] flex flex-col">
        {children}
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
