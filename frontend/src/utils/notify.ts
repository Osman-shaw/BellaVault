export type NotifyType = "success" | "error" | "info";

interface NotifyPayload {
  message: string;
  type?: NotifyType;
}

const EVENT_NAME = "bellavault:notify";

export function notify(message: string, type: NotifyType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NotifyPayload>(EVENT_NAME, { detail: { message, type } }));
}

export function notifySuccess(message: string) {
  notify(message, "success");
}

export function notifyError(message: string) {
  notify(message, "error");
}

export function notifyInfo(message: string) {
  notify(message, "info");
}

export function subscribeNotify(handler: (payload: NotifyPayload) => void) {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<NotifyPayload>;
    if (customEvent.detail?.message) {
      handler(customEvent.detail);
    }
  };

  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener);
}
