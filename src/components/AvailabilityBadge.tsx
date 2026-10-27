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
        "inline-flex items-center rounded-full border-2 font-bold shadow-[0_1px_3px_rgba(0,0,0,0.25)]",
        sm ? "gap-1.5 px-2.5 py-0.5 text-[10px]" : "gap-2 px-3.5 py-1 text-xs",
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
