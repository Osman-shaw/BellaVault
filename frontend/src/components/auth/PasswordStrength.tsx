type Checks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
};

const rules: { key: keyof Checks; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "lower", label: "One lowercase letter" },
  { key: "upper", label: "One uppercase letter" },
  { key: "number", label: "One number" },
  { key: "special", label: "One special character" },
];

export function PasswordStrength({ checks }: { checks: Checks }) {
  return (
    <ul className="auth-password-rules" aria-label="Password requirements">
      {rules.map(({ key, label }) => (
        <li key={key} className={checks[key] ? "auth-password-rules__ok" : "auth-password-rules__no"}>
          <span className="auth-password-rules__icon" aria-hidden>
            {checks[key] ? "✓" : "○"}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
