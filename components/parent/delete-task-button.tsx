"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteTaskAction } from "@/app/(app)/parent/tasks/actions";
import { useT } from "@/lib/i18n/client";

type Props = {
  taskId: string;
  title: string;
  variant?: "icon" | "full";
  onDeleted?: () => void;
};

/**
 * Client button that hard-deletes a task definition (plus its assignments)
 * via an inline two-step confirm. Used on both the task list (icon) and the
 * edit page (full-width danger button). `onDeleted` is optional — the edit
 * page passes a router.push so the user ends up back on the list.
 *
 * We avoid window.confirm() on purpose: Chrome silently suppresses it in
 * some desktop contexts, which makes the button look dead.
 */
export function DeleteTaskButton({
  taskId,
  title,
  variant = "icon",
  onDeleted,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function askConfirm(e: React.MouseEvent) {
    stop(e);
    setConfirming(true);
  }

  function cancel(e: React.MouseEvent) {
    stop(e);
    setConfirming(false);
  }

  function doDelete(e: React.MouseEvent) {
    stop(e);
    setError(null);
    start(async () => {
      const res = await deleteTaskAction(taskId);
      if (!res.ok) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      setConfirming(false);
      if (onDeleted) onDeleted();
      router.refresh();
    });
  }

  const errorEl = error ? (
    <p className="mt-1 text-xs text-danger-700">{error}</p>
  ) : null;

  if (variant === "icon") {
    return (
      <div className="shrink-0 flex flex-col items-end gap-1">
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={doDelete}
              disabled={pending}
              aria-label={t.app.yes}
              className="inline-flex items-center justify-center h-9 px-2 rounded-lg bg-danger-500 text-white text-sm font-medium hover:bg-danger-700 disabled:opacity-50"
            >
              {pending ? "…" : t.app.yes}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              aria-label={t.app.no}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={askConfirm}
            aria-label={t.tasks.delete}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-danger-700 hover:bg-danger-50"
          >
            {/* Trash glyph — keeps us off an icon-library dependency. */}
            <span aria-hidden className="text-base leading-none">
              🗑
            </span>
          </button>
        )}
        {errorEl}
      </div>
    );
  }

  // Full-width variant on the edit page's danger-zone card.
  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={doDelete}
            disabled={pending}
          >
            {pending ? t.app.loading : t.app.yes}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={cancel}
            disabled={pending}
          >
            {t.app.cancel}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="danger" onClick={askConfirm}>
          {t.tasks.delete}
        </Button>
      )}
      {errorEl}
    </div>
  );
}
