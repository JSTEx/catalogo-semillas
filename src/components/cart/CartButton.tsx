"use client";

import { useCart } from "./CartProvider";

export default function CartButton({ onClick }: { onClick: () => void }) {
  const { count, loaded } = useCart();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Abrir pedido${loaded && count > 0 ? ` (${count})` : ""}`}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-brand-600 hover:shadow-xl"
    >
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
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M2 3h2.2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.5-1.2L21 7H5" />
      </svg>
      {loaded && count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-xs font-bold text-white dark:border-stone-900">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}