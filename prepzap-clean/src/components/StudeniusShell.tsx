import { ReactNode } from "react";

interface StudeniusShellProps {
  children: ReactNode;
  /** Hide bottom nav on focused tool flows (e.g. focus timer) */
  hideNav?: boolean;
}

/**
 * Mobile: 390px centered phone frame on dark canvas.
 * Desktop (lg+): full viewport, no frame, no bottom nav.
 */
export function StudeniusShell({ children, hideNav = false }: StudeniusShellProps) {
  return (
    <div className="studenius-app min-h-[100dvh] w-full flex justify-center bg-[#2a2a2a] lg:bg-[#FAF7F2]">
      <div className={`relative w-full max-w-[390px] lg:max-w-none min-h-[100dvh] bg-[#FAF7F2] border-x-[1.5px] border-black lg:border-x-0 shadow-[0_0_40px_rgba(0,0,0,0.2)] lg:shadow-none flex flex-col ${!hideNav ? 'pb-28 md:pb-0' : ''}`}>
        {children}
      </div>
    </div>
  );
}
