export type Theme = "light" | "dark";

export function readThemeCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]+)/);
  const v = match?.[1];
  if (v === "dark" || v === "light") return v;
  return null;
}

export function writeThemeCookie(theme: Theme): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `theme=${theme};path=/;max-age=31536000;samesite=lax${secure}`;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}