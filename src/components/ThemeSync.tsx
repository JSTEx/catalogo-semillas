"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  readThemeCookie,
  writeThemeCookie,
} from "@/lib/theme";

export default function ThemeSync() {
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {
      /* almacenamiento no disponible */
    }
    const cookie = readThemeCookie();
    if (!cookie && saved) {
      writeThemeCookie(saved === "dark" ? "dark" : "light");
    }
    applyTheme(cookie ?? (saved === "dark" ? "dark" : "light"));
  }, [ready]);

  return null;
}