import { useId } from "react";

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  fieldLabel?: string;
  id?: string;
}

export function FormSelect({ value, onChange, options, required, fieldLabel, id }: FormSelectProps) {
  const autoId = useId();
  const selectId = id ?? (fieldLabel ? autoId : undefined);

  const select = (
    <select
      id={selectId}
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (fieldLabel) {
    return (
      <div className="form-field">
        <label className="form-label" htmlFor={selectId}>
          {fieldLabel}
        </label>
        {select}
      </div>
    );
  }

  return select;
}
