import { statusMeta } from "@/lib/product-status";
import type { ProductStatus } from "@/lib/product-status";

interface Props {
  status: ProductStatus;
  withPulse?: boolean;
}

export default function AvailabilityBadge({ status, withPulse }: Props) {
  const meta = statusMeta(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md",
        meta.badge,
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full",
          meta.dot,
          withPulse && status !== "out_of_stock" ? "animate-pulse-ring" : "",
        ].join(" ")}
      />
      {meta.label}
    </span>
  );
}
