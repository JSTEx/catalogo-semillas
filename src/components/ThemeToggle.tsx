"use client";

import { useEffect, useState } from "react";
import { applyTheme, writeThemeCookie } from "@/lib/theme";

interface Props {
  className?: string;
}

export default function ThemeToggle({ className = "" }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    writeThemeCookie(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Activar modo claro" : "Activar modo nocturno"}
      aria-pressed={isDark}
      title={isDark ? "Modo claro" : "Modo nocturno"}
      className={[
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white/70 text-stone-600 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-200 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300",
        className,
      ].join(" ")}
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}