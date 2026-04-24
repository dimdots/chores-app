"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteTaskAction } from "@/app/(app)/parent/tasks/actions";
import { t } from "@/lib/i18n/ru";

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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

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
    start(async () => {
      const res = await deleteTaskAction(taskId);
      if (!res.ok) {
        window.alert(res.error);
        setConfirming(false);
        return;
      }
      setConfirming(false);
      if (onDeleted) onDeleted();
      router.refresh();
    });
  }

  if (variant === "icon") {
    if (confirming) {
      return (
        <div className="shrink-0 flex items-center gap-1">
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
      );
    }
    return (
      <button
        type="button"
        onClick={askConfirm}
        aria-label={t.tasks.delete}
        className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-danger-700 hover:bg-danger-50"
      >
        {/* Trash glyph — keeps us off an icon-library dependency. */}
        <span aria-hidden className="text-base leading-none">
          🗑
        </span>
      </button>
    );
  }

  // Full-width variant on the edit page's danger-zone card.
  if (confirming) {
    return (
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
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={askConfirm}
    >
      {t.tasks.delete}
    </Button>
  );
}
