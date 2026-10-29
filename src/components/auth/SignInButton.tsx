"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export default function SignInButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status !== "authenticated" || !session?.user) {
    return (
      <button
        type="button"
        onClick={() => void signIn("google", undefined, { prompt: "select_account" })}
        aria-label="Entrar con Google"
        title="Entrar con Google"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-3 text-sm font-medium text-stone-600 shadow-sm backdrop-blur-md transition-colors hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
      >
        <GoogleIcon />
        <span>Entrar</span>
      </button>
    );
  }

  const initial = (
    session.user.name?.[0] ||
    session.user.email?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cuenta"
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 pl-1.5 pr-2 text-sm font-medium text-stone-600 shadow-sm backdrop-blur-md transition-colors hover:border-brand-200 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={32}
            height={32}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
            {initial}
          </span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={["h-4 w-4 transition-transform", open ? "rotate-180" : ""].join(" ")}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900"
        >
          <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
            <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
              {session.user.name || "Mi cuenta"}
            </p>
            {session.user.email && (
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                {session.user.email}
              </p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-rose-600 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-rose-400"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
