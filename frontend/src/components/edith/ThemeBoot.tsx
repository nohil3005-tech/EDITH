import { useEffect } from "react";
import { useEdith } from "@/lib/store";

/** Applies the persisted theme class to <html> once mounted on the client. */
export function ThemeBoot() {
  const theme = useEdith((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}