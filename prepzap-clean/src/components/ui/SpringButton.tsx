import React, { forwardRef } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { playTap } from "@/lib/soundFX";
import { motionTokens } from "@/lib/motionTokens";
import { cn } from "@/lib/utils";

export interface SpringButtonProps extends HTMLMotionProps<"button"> {
  soundEnabled?: boolean;
}

export const SpringButton = forwardRef<HTMLButtonElement, SpringButtonProps>(
  ({ children, className, soundEnabled = true, onClick, disabled, type = "button", ...props }, ref) => {
    const reduced = useReducedMotion();
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (soundEnabled) playTap();
      onClick?.(event);
    };
    return (
      <motion.button
        {...props}
        type={type}
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        whileTap={reduced || disabled ? undefined : { scale: 0.98, y: 3 }}
        whileHover={reduced || disabled ? undefined : { y: -2 }}
        transition={motionTokens.spring}
        className={cn("min-h-11 touch-manipulation disabled:cursor-default disabled:opacity-50", className)}
      >
        {children}
      </motion.button>
    );
  }
);
SpringButton.displayName = "SpringButton";
