export default function Loading() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/70 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 animate-skeleton rounded-2xl bg-stone-200/80 dark:bg-stone-800/80" />
            <div className="space-y-2">
              <div className="h-4 w-40 animate-skeleton rounded-full bg-stone-200/80 dark:bg-stone-800/80" />
              <div className="h-3 w-28 animate-skeleton rounded-full bg-stone-200/80 dark:bg-stone-800/80" />
            </div>
          </div>
          <div className="h-11 w-full max-w-md animate-skeleton rounded-2xl bg-stone-200/80 dark:bg-stone-800/80" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-4 sm:px-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-8 w-24 animate-skeleton rounded-full bg-stone-200/80 dark:bg-stone-800/80"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div
          role="status"
          aria-label="Cargando catalogo"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 90}ms` }}
              className="animate-skeleton flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white/70 backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-900/70"
            >
              <div className="aspect-square w-full bg-stone-200/80 dark:bg-stone-800/80" />
              <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
                <div className="h-4 w-24 rounded-full bg-stone-200/80 dark:bg-stone-800/80" />
                <div className="h-8 w-8 rounded-full bg-stone-200/80 dark:bg-stone-800/80" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}