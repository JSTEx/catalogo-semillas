"use client";

import { useEffect, useState } from "react";
import { applyTheme, writeThemeCookie } from "@/lib/theme";

interface Props {
  className?: string;
}

export default function ThemeToggle({ className = "" }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [pressed, setPressed] = useState(false);

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
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-label={isDark ? "Activar modo claro" : "Activar modo nocturno"}
      title={isDark ? "Modo claro" : "Modo nocturno"}
      className={[
        "group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border p-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        isDark
          ? "border-stone-700 bg-stone-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-brand-500/50"
          : "border-stone-200 bg-brand-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] hover:border-brand-300",
        pressed ? "scale-95" : "scale-100",
        className,
      ].join(" ")}
    >
      {/* Icono de sol (lado del modo claro) */}
      <span
        className={[
          "pointer-events-none absolute left-1.5 flex h-6 w-6 items-center justify-center rounded-full text-amber-500 transition-all duration-300",
          isDark ? "translate-y-0 opacity-40" : "-translate-y-10 opacity-100",
        ].join(" ")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>

      {/* Icono de luna (lado del modo oscuro) */}
      <span
        className={[
          "pointer-events-none absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-indigo-300 transition-all duration-300",
          isDark ? "translate-y-0 opacity-100" : "translate-y-10 opacity-40",
        ].join(" ")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      </span>

      {/* Knob deslizante */}
      <span
        className={[
          "pointer-events-none relative flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "translate-x-full ring-stone-600"
            : "translate-x-0 ring-stone-200",
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
            className="h-3.5 w-3.5 text-stone-700"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
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
            className="h-3.5 w-3.5 text-amber-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}