interface Props {
  className?: string;
  label?: string;
}

export default function Loader({ className = "", label }: Props) {
  return (
    <span
      className={["inline-flex items-center gap-2 align-middle", className].join(
        " ",
      )}
    >
      <svg
        className="h-4 w-4 shrink-0 animate-spin-slow"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="4"
        />
        <path
          d="M21 12a9 9 0 0 1-9 9"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}