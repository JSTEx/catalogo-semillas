"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Error al cargar una página:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-5 py-10 dark:bg-stone-950">
      <section
        role="alert"
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:p-8"
      >
        <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          No se pudo cargar la página
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          Puede ser un problema temporal de conexión. Vuelve a intentarlo.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            Referencia: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
