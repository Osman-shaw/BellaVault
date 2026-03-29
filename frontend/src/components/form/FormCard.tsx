import { FormEvent, ReactNode } from "react";

interface FormCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Auth pages use elevated card styling; screen = standard app pages */
  variant?: "default" | "auth" | "screen";
  className?: string;
}

export function FormCard({ title, description, children, onSubmit, variant = "default", className }: FormCardProps) {
  const cardClass =
    variant === "auth" ? "form-card form-card--auth" : variant === "screen" ? "form-card form-card--screen" : "form-card";
  const formClass = [cardClass, className].filter(Boolean).join(" ");
  return (
    <form className={formClass} onSubmit={onSubmit}>
      <div className="form-card-header">
        <h2 className="form-title">{title}</h2>
        {description ? <p className="form-description">{description}</p> : null}
      </div>
      <div className="form-grid">{children}</div>
    </form>
  );
}
