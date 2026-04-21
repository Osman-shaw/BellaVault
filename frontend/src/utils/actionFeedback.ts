import { notifyError, notifySuccess } from "@/utils/notify";

/** Short headline shown bold; body is the warm, human line underneath. */
function success(headline: string, body: string) {
  notifySuccess(body, headline);
}

function err(headline: string, body: string) {
  notifyError(body, headline);
}

const hint = {
  daily:
    "Small updates like this are what make BellaVault feel effortless day after day.",
  trail: "Steady records today mean calmer closes tomorrow — you are building a habit worth keeping.",
  clarity: "Fresh numbers keep the whole team aligned. Nice work staying on top of it.",
  space: "A lean ledger is easier to scan. You can always add a new row if plans change.",
  vault: "Your operating cash picture just got clearer. Check the Vault when you want the full story.",
};

export const actionFeedback = {
  dealCreated: () => success("Deal added ✓", `Linked and logged. ${hint.daily}`),
  dealUpdated: () => success("Deal updated ✓", `Changes saved. ${hint.clarity}`),
  dealDeleted: () => success("Deal removed ✓", `${hint.space}`),

  partnerCreated: () => success("Partner added ✓", `They are in your directory. ${hint.trail}`),
  partnerUpdated: () => success("Partner saved ✓", `Profile refreshed. ${hint.clarity}`),
  partnerDeleted: () => success("Partner removed ✓", `${hint.space}`),

  ledgerSaved: () => success("Capital logged ✓", `That movement is on the books. ${hint.daily}`),
  ledgerRemoved: () => success("Entry removed ✓", `Ledger tightened up. ${hint.space}`),

  purchaseCreated: () => success("Purchase saved ✓", `Buy recorded. ${hint.trail}`),
  purchaseUpdated: () => success("Purchase updated ✓", `Row refreshed. ${hint.clarity}`),
  purchaseDeleted: () => success("Purchase removed ✓", `${hint.space}`),

  saleCreated: () => success("Sale saved ✓", `Export logged. ${hint.trail}`),
  saleUpdated: () => success("Sale updated ✓", `Numbers refreshed. ${hint.clarity}`),
  saleDeleted: () => success("Sale removed ✓", `${hint.space}`),

  borrowCreated: () => success("Borrow saved ✓", `Cash-out recorded. ${hint.daily}`),
  borrowUpdated: () => success("Borrow updated ✓", `Balances adjusted. ${hint.clarity}`),
  borrowDeleted: () => success("Borrow removed ✓", `${hint.space}`),

  vaultDeposit: () => success("Vault topped up ✓", `${hint.vault}`),

  savingsOpened: () => success("Savings account opened ✓", `Depositor is on file. ${hint.trail}`),
  savingsUpdated: () => success("Depositor updated ✓", `Details refreshed. ${hint.clarity}`),
  savingsDeposit: () => success("Deposit recorded ✓", `Balance adjusted. ${hint.daily}`),
  savingsWithdrawal: () => success("Withdrawal recorded ✓", `Balance adjusted. ${hint.daily}`),
  savingsClosed: () => success("Savings account closed ✓", `${hint.space}`),

  signedOut: () => success("Signed out ✓", "See you soon — your vault will be right here when you return."),

  /** Pass through API / validation text with a friendly frame. */
  problemSaving: (detail: string) => err("Could not save", detail),
  problemLoading: (detail: string) => err("Could not load", detail),
};
