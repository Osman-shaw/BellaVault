"use client";

import { useEffect, useMemo, useState } from "react";
import { NotifyType, subscribeNotify } from "@/utils/notify";

type Toast = {
  id: string;
  message: string;
  type: NotifyType;
};

export function NotificationCenter() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeNotify(({ message, type = "info" }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, type }].slice(-4));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3200);
    });
  }, []);

  const items = useMemo(() => toasts, [toasts]);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
