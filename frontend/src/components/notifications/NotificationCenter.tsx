"use client";

import { useEffect, useMemo, useState } from "react";
import { NotifyPayload, NotifyType, subscribeNotify } from "@/utils/notify";

type Toast = {
  id: string;
  message: string;
  type: NotifyType;
  headline?: string;
};

export function NotificationCenter() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeNotify(({ message, type = "info", headline }: NotifyPayload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const duration = headline ? 4800 : 3600;
      setToasts((prev) => [...prev, { id, message, type, headline }].slice(-4));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    });
  }, []);

  const items = useMemo(() => toasts, [toasts]);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}${toast.headline ? " toast--rich" : ""}`}>
          {toast.headline ? <div className="toast__headline">{toast.headline}</div> : null}
          <div className="toast__body">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
