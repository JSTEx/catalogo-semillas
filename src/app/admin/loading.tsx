import Loader from "@/components/Loader";

export default function AdminLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="animate-fade-in relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br from-stone-50 via-white to-brand-50/60 px-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950"
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500 text-white shadow-lg animate-pulse-ring">
        <Loader className="h-10 w-10" />
      </span>
      <p className="animate-fade-in text-sm font-medium text-stone-500 dark:text-stone-400">
        Cargando panel de administracion...
      </p>
    </main>
  );
}