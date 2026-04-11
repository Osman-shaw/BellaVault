type VaultState = "locked" | "opening" | "open";

export function VaultDoor({ state }: { state: VaultState }) {
  return (
    <div className={`vault-door vault-door--${state}`} aria-hidden>
      <div className="vault-door__body">
        <div className="vault-door__ring" />
        <div className="vault-door__hinge vault-door__hinge--l" />
        <div className="vault-door__hinge vault-door__hinge--r" />
        <div className="vault-door__panel-wrap">
          <div className="vault-door__panel">
            <div className="vault-door__dial">
              <span />
              <span />
              <span />
            </div>
            <div className="vault-door__bars">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
        {state === "locked" ? (
          <div className="vault-door__lock">
            <div className="vault-door__lock-body" />
            <div className="vault-door__lock-shackle" />
          </div>
        ) : null}
      </div>
      <p className="vault-door__caption">{state === "locked" ? "Vault locked" : state === "opening" ? "Opening…" : "Welcome in"}</p>
    </div>
  );
}

export function VaultDoorAside({ locked }: { locked: boolean }) {
  return (
    <div className="vault-aside">
      <VaultDoor state={locked ? "locked" : "open"} />
      <p className="vault-aside__hint">{locked ? "Sign in or register to open your BellaVault." : "Your workspace is unlocked."}</p>
    </div>
  );
}
