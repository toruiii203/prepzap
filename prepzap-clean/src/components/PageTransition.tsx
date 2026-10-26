import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motionTokens, motionVariables } from "@/lib/motionTokens";

/** Keep content readable immediately; route changes never wait for an exit animation. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      data-motion-page
      initial={{ opacity: 0.98 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : motionTokens.instant, ease: motionTokens.ease }}
      style={{ ...motionVariables, width: "100%", minHeight: 0, display: "flex", flexDirection: "column", flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
