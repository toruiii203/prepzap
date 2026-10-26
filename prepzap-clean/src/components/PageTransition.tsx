import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
      style={{ width: "100%", minHeight: 0, display: "flex", flexDirection: "column", flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
