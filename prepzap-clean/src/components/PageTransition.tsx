import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const getTransition = () => {
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return { duration: 0 };
  }
  return springTransition;
};

// A highly subtle, fast iOS-style scale and fade in.
// We avoid sliding heavily on web/PWA so it doesn't feel sluggish.
const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    y: 10,
  },
  in: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    scale: 0.98,
    y: -10,
  }
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={getTransition()}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
