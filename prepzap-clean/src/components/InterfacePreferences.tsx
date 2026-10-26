import { useEffect } from "react";
import { motionVariables } from "@/lib/motionTokens";

/** CSS tokens also reach Radix portals, which mount outside the page container. */
export function InterfacePreferences() {
  useEffect(() => {
    for (const [name, value] of Object.entries(motionVariables)) document.documentElement.style.setProperty(name, String(value));
  }, []);
  return null;
}
