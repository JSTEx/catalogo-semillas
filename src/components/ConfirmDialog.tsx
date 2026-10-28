"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const resolver = useRef<(value: boolean) => void>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions({
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText ?? "Confirmar",
      cancelText: opts.cancelText ?? "Cancelar",
      destructive: opts.destructive ?? false,
    });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    resolver.current?.(result);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm dark:bg-black/70" onClick={() => close(false)} />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-stone-200/70 bg-white shadow-2xl dark:border-stone-800/70 dark:bg-stone-900">
            <div className="px-6 pt-6">
              {options.title && <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{options.title}</h3>}
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{options.message}</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {options.cancelText}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors",
                  options.destructive
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-brand-500 hover:bg-brand-600",
                ].join(" ")}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
