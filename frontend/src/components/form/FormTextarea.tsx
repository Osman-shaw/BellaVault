import { useId } from "react";

interface FormTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  label?: string;
  id?: string;
}

export function FormTextarea({ value, onChange, placeholder, rows = 3, label, id }: FormTextareaProps) {
  const autoId = useId();
  const textareaId = id ?? (label ? autoId : undefined);

  const control = (
    <textarea
      id={textareaId}
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      aria-label={label ? undefined : placeholder}
    />
  );

  if (label) {
    return (
      <div className="form-field">
        <label className="form-label" htmlFor={textareaId}>
          {label}
        </label>
        {control}
      </div>
    );
  }

  return control;
}
