import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motionTokens, motionVariables } from "@/lib/motionTokens";

/** Routes own the key/presence boundary so public and protected pages exit alike. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      data-motion-page
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: motionTokens.exit } }}
      transition={{ duration: reduced ? motionTokens.instant : motionTokens.enter, ease: motionTokens.ease }}
      style={{ ...motionVariables, width: "100%", minHeight: 0, display: "flex", flexDirection: "column", flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
