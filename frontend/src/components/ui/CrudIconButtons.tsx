type BtnProps = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  variant?: "ghost" | "danger";
};

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function baseClass(variant: BtnProps["variant"]) {
  return variant === "danger" ? "crud-icon-btn crud-icon-btn--danger" : "crud-icon-btn";
}

export function ViewIconButton({ onClick, label, disabled }: BtnProps) {
  return (
    <button type="button" className={baseClass("ghost")} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <IconEye />
    </button>
  );
}

export function EditIconButton({ onClick, label, disabled }: BtnProps) {
  return (
    <button type="button" className={baseClass("ghost")} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <IconPencil />
    </button>
  );
}

export function DeleteIconButton({ onClick, label, disabled }: BtnProps) {
  return (
    <button type="button" className={baseClass("danger")} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <IconTrash />
    </button>
  );
}
