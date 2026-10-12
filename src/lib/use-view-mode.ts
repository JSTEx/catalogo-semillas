"use client";

import { useEffect, useState } from "react";

export type ViewMode = "grid" | "compact" | "list";

const VALID: ViewMode[] = ["grid", "compact", "list"];

export function useViewMode(
  key: string,
  initial: ViewMode = "grid",
): readonly [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(initial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored && (VALID as string[]).includes(stored)) {
        setMode(stored as ViewMode);
      }
    } catch {
      /* almacenamiento no disponible */
    }
  }, [key]);

  function update(next: ViewMode) {
    setMode(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  return [mode, update] as const;
}
