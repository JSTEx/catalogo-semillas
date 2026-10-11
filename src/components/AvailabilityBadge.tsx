interface Props {
  available: boolean;
  withPulse?: boolean;
}

export default function AvailabilityBadge({ available, withPulse }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md",
        available
          ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700"
          : "border-amber-200/70 bg-amber-50/80 text-amber-700",
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full",
          available ? "bg-emerald-500" : "bg-amber-500",
          available && withPulse ? "animate-pulse-ring" : "",
        ].join(" ")}
      />
      {available ? "Disponible" : "Agotado"}
    </span>
  );
}
