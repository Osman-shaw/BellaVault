interface FormButtonProps {
  label: string;
  loadingLabel: string;
  loading?: boolean;
  variant?: "primary" | "auth";
}

export function FormButton({ label, loadingLabel, loading, variant = "primary" }: FormButtonProps) {
  const cls = variant === "auth" ? "form-button form-button--auth" : "form-button";
  return (
    <button className={cls} type="submit" disabled={loading}>
      {loading ? loadingLabel : label}
    </button>
  );
}
