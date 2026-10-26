import { useKeyboardViewport } from "@/hooks/useKeyboardViewport";
import { useEffect } from "react";
import { motionVariables } from "@/lib/motionTokens";
import { useInterfacePreferences } from "@/lib/interfacePreferences";

/** Theme and animation tokens also reach body-level Radix portals. */
export function InterfacePreferences() {
  useKeyboardViewport();
  const { theme } = useInterfacePreferences();
  useEffect(() => {
    for (const [name, value] of Object.entries(motionVariables)) document.documentElement.style.setProperty(name, String(value));
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || theme === "system" && query.matches;
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#15120F" : "#FAF7F2");
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
