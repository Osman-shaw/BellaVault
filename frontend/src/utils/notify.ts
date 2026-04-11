export type NotifyType = "success" | "error" | "info";

export interface NotifyPayload {
  message: string;
  type?: NotifyType;
  /** Short bold line above the message (rich toast). */
  headline?: string;
}

const EVENT_NAME = "bellavault:notify";

export function notify(message: string, type: NotifyType = "info", headline?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NotifyPayload>(EVENT_NAME, { detail: { message, type, headline } }));
}

export function notifySuccess(message: string, headline?: string) {
  notify(message, "success", headline);
}

export function notifyError(message: string, headline?: string) {
  notify(message, "error", headline);
}

export function notifyInfo(message: string, headline?: string) {
  notify(message, "info", headline);
}

export function subscribeNotify(handler: (payload: NotifyPayload) => void) {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<Partial<NotifyPayload> & { message?: string }>;
    const detail = customEvent.detail;
    if (detail?.message) {
      handler({
        message: detail.message,
        type: detail.type,
        headline: detail.headline,
      });
    }
  };

  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener);
}
