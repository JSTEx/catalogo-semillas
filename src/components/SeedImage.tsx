"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ImageProps } from "next/image";

type Rgb = [number, number, number];

const colorCache = new Map<string, [string, string] | null>();

function hex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function lighter(c: Rgb, t: number): Rgb {
  return [
    Math.round(c[0] + (255 - c[0]) * t),
    Math.round(c[1] + (255 - c[1]) * t),
    Math.round(c[2] + (255 - c[2]) * t),
  ];
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

async function extractDominantColors(
  src: string,
): Promise<[string, string] | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const img = await createImageBitmap(blob);

    const maxDim = 32;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    img.close?.();

    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 64) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6);
      const e = buckets.get(key);
      if (e) {
        e.r += r;
        e.g += g;
        e.b += b;
        e.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }
    if (buckets.size === 0) return null;

    const entries = [...buckets.values()].sort((a, b) => b.n - a.n);
    const avg = (e: { r: number; g: number; b: number; n: number }): Rgb => [
      Math.round(e.r / e.n),
      Math.round(e.g / e.n),
      Math.round(e.b / e.n),
    ];

    const c1 = avg(entries[0]);
    let c2: Rgb = c1;
    let best = 0;
    const minShare = Math.max(2, entries[0].n * 0.08);
    for (const e of entries) {
      if (e.n < minShare && e !== entries[0]) continue;
      const c = avg(e);
      const d = distance(c1, c);
      if (d > best) {
        best = d;
        c2 = c;
      }
    }
    if (best < 40) c2 = lighter(c1, 0.55);

    return [hex(c1), hex(c2)];
  } catch {
    return null;
  }
}

export default function SeedImage(props: ImageProps) {
  const src = props.src;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [colors, setColors] = useState<[string, string] | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setLoaded(false);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (typeof src === "string" && visible) {
      const nav = navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      };
      const conn = nav.connection;
      const saveData = conn?.saveData;
      const slow = conn?.effectiveType && /2g|slow-2g/.test(conn.effectiveType);
      if (saveData || slow) {
        setColors(null);
      } else {
        const cached = colorCache.get(src);
        if (cached !== undefined) {
          setColors(cached);
        } else {
          extractDominantColors(src).then((c) => {
            if (c) colorCache.set(src, c);
            if (!cancelled) setColors(c);
          });
        }
      }
    }

    // Si la imagen ya esta cargada en caché, onLoad no se vuelve a disparar.
    // Verificamos complete y, si no, esperamos el evento onLoad/onError.
    if (imgRef.current?.complete) {
      setLoaded(true);
    } else {
      timer = setTimeout(() => {
        if (imgRef.current?.complete) setLoaded(true);
      }, 400);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [src, visible]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 blur-3xl transition-opacity duration-1000",
          colors
            ? loaded
              ? "opacity-80"
              : "opacity-90"
            : "bg-gradient-to-br from-brand-100 via-brand-200/40 to-emerald-100/50 dark:from-brand-900/40 dark:via-brand-700/25 dark:to-emerald-900/40",
        ].join(" ")}
        style={
          colors
            ? {
                backgroundImage: `linear-gradient(135deg, ${colors[0]}cc, ${colors[1]}55)`,
              }
            : undefined
        }
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
        alt={props.alt}
        ref={imgRef}
        loading={props.loading ?? "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={[
          props.className ?? "",
          "transition-all duration-1000 ease-out",
          loaded ? "scale-100 opacity-100 blur-0" : "scale-[1.03] opacity-80 blur-sm",
        ].join(" ")}
      />
    </div>
  );
}