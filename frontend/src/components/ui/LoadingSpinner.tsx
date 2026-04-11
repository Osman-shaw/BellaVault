type Props = {
  /** Accessible label for screen readers */
  label?: string;
  size?: "sm" | "md" | "lg";
  /** `onDark` = light ring for buttons; `default` = accent ring on light pages */
  variant?: "default" | "onDark";
  className?: string;
};

export function LoadingSpinner({ label = "Loading", size = "md", variant = "default", className }: Props) {
  const tone = variant === "onDark" ? "spinner--on-dark" : "spinner--default";
  return (
    <span
      className={`spinner spinner--${size} ${tone} ${className ?? ""}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="spinner__ring" aria-hidden />
    </span>
  );
}
