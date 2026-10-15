"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

interface Props {
  redirectTo: string;
}

export default function LoginForm({ redirectTo }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (res.status === 429) {
        setError("Demasiados intentos. Espera un minuto e intentalo de nuevo.");
      } else {
        setError(data?.error ?? "No se pudo iniciar sesion.");
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br from-stone-50 via-white to-brand-50/60 px-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="animate-fade-in-up w-full max-w-md rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-stone-700/60 dark:bg-stone-900/70">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Panel de administracion
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Usuario
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-800 outline-none transition-all duration-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader label="Ingresando..." /> : "Ingresar"}
          </button>
        </form>
      </div>

      <a
        href="/"
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 text-sm font-medium text-stone-600 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
        Volver al catalogo
      </a>
    </main>
  );
}
