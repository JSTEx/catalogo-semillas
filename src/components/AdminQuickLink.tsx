"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AdminQuickLink() {
  const { data: session, status } = useSession();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) {
      setAllowed(false);
      return;
    }
    let mounted = true;
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setAllowed(!!d?.allowed);
      })
      .catch(() => {
        if (mounted) setAllowed(false);
      });
    return () => {
      mounted = false;
    };
  }, [session?.user?.email, status]);

  if (status !== "authenticated" || !allowed) return null;

  return (
    <Link
      href="/admin"
      title="Ir al panel de administracion"
      aria-label="Ir al panel de administracion"
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-700 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/20"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    </Link>
  );
}
