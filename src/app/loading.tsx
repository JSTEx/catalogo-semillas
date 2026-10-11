import Loader from "@/components/Loader";

export default function Loading() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="skeleton h-10 w-10 rounded-2xl" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-40 rounded-full" />
              <div className="skeleton h-3 w-28 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-11 w-full max-w-md rounded-2xl" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-4 sm:px-6">
          {[0, 1, 2].map((i) => (
            <span key={i} className="skeleton h-8 w-24 rounded-full" />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div
          role="status"
          aria-live="polite"
          aria-label="Cargando catalogo"
          className="animate-fade-in mb-8 flex items-center justify-center gap-3"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg animate-pulse-ring">
            <Loader className="h-6 w-6" />
          </span>
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Cargando catalogo...
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 90}ms` }}
              className="animate-fade-in-up flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white/70 backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70"
            >
              <div className="skeleton aspect-square w-full" />
              <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
