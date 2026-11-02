"use client";

import Image from "next/image";
import type { ImageProps } from "next/image";

export default function SeedImage(props: ImageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-200/40 to-emerald-100/50 dark:from-brand-900/40 dark:via-brand-700/25 dark:to-emerald-900/40"
      />
      <Image
        {...props}
        alt={props.alt}
        loading={props.loading ?? "lazy"}
        className={props.className}
      />
    </div>
  );
}