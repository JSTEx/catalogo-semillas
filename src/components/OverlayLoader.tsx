interface Props {
  label?: string;
}

export default function OverlayLoader({ label = "Cargando" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-stone-950/50"
    >
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-spin-slow rounded-full border-2 border-stone-200/80 border-t-brand-500 dark:border-stone-700/80 dark:border-t-brand-400"
      />
    </div>
  );
}
