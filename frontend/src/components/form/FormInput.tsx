import { useId } from "react";

interface FormInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  type?: "text" | "number" | "password" | "email" | "date" | "time" | "datetime-local";
  required?: boolean;
  min?: string;
  step?: string;
  autoComplete?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  id?: string;
}

export function FormInput({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
  required,
  min,
  step,
  autoComplete,
  inputMode,
  id,
}: FormInputProps) {
  const autoId = useId();
  const inputId = id ?? (label ? autoId : undefined);
  const control = (
    <input
      id={inputId}
      className="form-control"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
      autoComplete={autoComplete}
      inputMode={inputMode}
      aria-label={label ? undefined : placeholder}
    />
  );

  if (label) {
    return (
      <div className="form-field">
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
        {control}
      </div>
    );
  }

  return control;
}
