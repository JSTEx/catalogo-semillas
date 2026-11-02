"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { ImageProps } from "next/image";

type Rgb = [number, number, number];

function extractColors(image: HTMLImageElement): [string, string] | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 64) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.count += 1;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }

    const entries = [...buckets.values()].sort((a, b) => b.count - a.count);
    if (entries.length === 0) return null;

    const average = (entry: (typeof entries)[number]): Rgb => [
      Math.round(entry.r / entry.count),
      Math.round(entry.g / entry.count),
      Math.round(entry.b / entry.count),
    ];
    const first = average(entries[0]);
    let second = first;
    let greatestDistance = 0;

    for (const entry of entries) {
      if (entry.count < Math.max(2, entries[0].count * 0.08)) continue;
      const color = average(entry);
      const distance = Math.hypot(
        first[0] - color[0],
        first[1] - color[1],
        first[2] - color[2],
      );
      if (distance > greatestDistance) {
        greatestDistance = distance;
        second = color;
      }
    }

    if (greatestDistance < 40) {
      second = [
        Math.round(first[0] + (255 - first[0]) * 0.55),
        Math.round(first[1] + (255 - first[1]) * 0.55),
        Math.round(first[2] + (255 - first[2]) * 0.55),
      ];
    }

    const toHex = (color: Rgb) =>
      `#${color.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    return [toHex(first), toHex(second)];
  } catch {
    return null;
  }
}

export default function SeedImage(props: ImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [colorSample, setColorSample] = useState<{
    src: string;
    colors: [string, string] | null;
  } | null>(null);
  const src =
    typeof props.src === "string"
      ? props.src
      : "default" in props.src
        ? props.src.default.src
        : props.src.src;
  const colors =
    colorSample && colorSample.src === src ? colorSample.colors : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 blur-3xl transition-opacity duration-500",
          colors
            ? "opacity-80"
            : "bg-gradient-to-br from-brand-100 via-brand-200/40 to-emerald-100/50 opacity-90 dark:from-brand-900/40 dark:via-brand-700/25 dark:to-emerald-900/40",
        ].join(" ")}
        style={
          colors
            ? {
                backgroundImage: `linear-gradient(135deg, ${colors[0]}cc, ${colors[1]}55)`,
              }
            : undefined
        }
      />
      <Image
        {...props}
        alt={props.alt}
        ref={imageRef}
        loading={props.loading ?? "lazy"}
        onLoad={(event) => {
          props.onLoad?.(event);
          setColorSample({
            src,
            colors: extractColors(event.currentTarget),
          });
        }}
        className={props.className}
      />
    </div>
  );
}