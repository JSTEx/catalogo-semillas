"use client";

import type { ViewMode } from "@/lib/use-view-mode";

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const OPTIONS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: "grid",
    label: "Cuadricula",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    mode: "compact",
    label: "Compacta",
    icon: (
      <>
        <circle cx="5" cy="5" r="1.8" />
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="19" cy="5" r="1.8" />
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
        <circle cx="5" cy="19" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
        <circle cx="19" cy="19" r="1.8" />
      </>
    ),
  },
  {
    mode: "list",
    label: "Lista",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="4" rx="1.5" />
        <rect x="3" y="10" width="18" height="4" rx="1.5" />
        <rect x="3" y="16" width="18" height="4" rx="1.5" />
      </>
    ),
  },
];

export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Vista de productos"
      className="inline-flex shrink-0 rounded-2xl border border-stone-200 bg-white/70 p-1 shadow-sm backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/70"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onChange(opt.mode)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200",
              active
                ? "bg-brand-500 text-white shadow-sm"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
            ].join(" ")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              {opt.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
