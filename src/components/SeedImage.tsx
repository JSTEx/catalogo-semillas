"use client";

import { useState } from "react";
import Image from "next/image";
import type { ImageProps } from "next/image";

export default function SeedImage(props: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-200/40 to-emerald-100/50 blur-3xl transition-opacity duration-1000 dark:from-brand-900/40 dark:via-brand-700/25 dark:to-emerald-900/40",
          loaded ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
          loaded ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <span className="h-8 w-8 animate-spin-slow rounded-full border-2 border-brand-200/70 border-t-brand-500 dark:border-stone-700 dark:border-t-brand-400" />
      </div>
      <Image
        {...props}
        onLoad={() => setLoaded(true)}
        className={[
          props.className ?? "",
          "transition-all duration-1000 ease-out",
          loaded
            ? "scale-100 opacity-100 blur-0"
            : "scale-[1.03] opacity-80 blur-sm",
        ].join(" ")}
      />
    </div>
  );
}