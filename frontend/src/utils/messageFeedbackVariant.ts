export function messageFeedbackVariant(message: string): "info" | "error" | "success" {
  const m = message.toLowerCase();
  if (/(successfully|updated\.|deleted\.|created\.)/.test(m)) return "success";
  if (/(failed|not allowed|cannot |must be |required|invalid)/.test(m)) return "error";
  return "info";
}
