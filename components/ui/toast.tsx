"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastAction = { label: string; run: () => void | Promise<void> };

export type ToastOptions = {
  message: string;
  action?: ToastAction;
  /** Auto-dismiss after this many ms (default 5000). */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

// Default is a no-op so calling useToast() outside the provider doesn't crash
// (it just won't show anything). The provider supplies the real implementation.
const ToastContext = createContext<(opts: ToastOptions) => void>(() => {});

/** Imperatively show a toast: `const toast = useToast(); toast({ message })`. */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * Lightweight in-memory toast queue — no external dependency. Mounted once in
 * the (app) layout so any client component below can call `useToast()`. Toasts
 * stack at the bottom of the viewport and auto-dismiss; an optional action
 * (e.g. "Undo") fires its callback and dismisses immediately.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev, { ...opts, id }]);
      const duration = opts.duration ?? 5000;
      window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-4 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-float"
          >
            <span>{item.message}</span>
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  void item.action!.run();
                  remove(item.id);
                }}
                className="shrink-0 font-semibold underline underline-offset-2 hover:text-slate-200"
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
