import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;

    // 🔥 Disable transitions temporarily
    root.classList.add("no-transition");

    root.classList.remove("light", "dark");
    root.classList.add(theme);

    localStorage.setItem("theme", theme);

    // 🔥 Re-enable transitions after next frame
    setTimeout(() => {
      root.classList.remove("no-transition");
    }, 50);

  }, [theme]);

  return { theme, setTheme };
}