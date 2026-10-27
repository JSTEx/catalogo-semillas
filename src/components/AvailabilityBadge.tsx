import { statusMeta } from "@/lib/product-status";
import type { ProductStatus } from "@/lib/product-status";

interface Props {
  status: ProductStatus;
  withPulse?: boolean;
  size?: "sm" | "md";
}

export default function AvailabilityBadge({
  status,
  withPulse,
  size = "md",
}: Props) {
  const meta = statusMeta(status);
  const sm = size === "sm";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-semibold shadow-lg ring-1 ring-black/5 backdrop-blur-sm",
        sm ? "gap-1.5 px-2 py-0.5 text-[10px]" : "gap-2 px-3 py-1 text-xs",
        meta.badge,
      ].join(" ")}
    >
      <span
        className={[
          "rounded-full",
          sm ? "h-1.5 w-1.5" : "h-2 w-2",
          meta.dot,
          withPulse && status !== "out_of_stock" ? "animate-pulse-ring" : "",
        ].join(" ")}
      />
      {meta.label}
    </span>
  );
}
