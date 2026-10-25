import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { playTap } from "@/lib/soundFX";

export interface SpringButtonProps extends HTMLMotionProps<"button"> {
  soundEnabled?: boolean;
}

export const SpringButton = forwardRef<HTMLButtonElement, SpringButtonProps>(
  ({ children, className = "", soundEnabled = true, onClick, disabled, ...props }, ref) => {
    const isReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (soundEnabled && typeof window !== "undefined" && localStorage.getItem("pz_sound_muted") !== "true") {
        try {
          playTap();
        } catch {}
      }
      if (onClick) onClick(e);
    };

    if (isReducedMotion || disabled) {
      return (
        <button
          ref={ref}
          disabled={disabled}
          onClick={handleClick}
          className={className}
          {...(props as any)}
        >
          {children}
        </button>
      );
    }

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        whileTap={{ scale: 0.94, y: 2 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className={className}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

SpringButton.displayName = "SpringButton";
