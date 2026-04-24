"use client";

import { useOptimistic, useTransition } from "react";
import { toggleReactionAction } from "@/lib/actions/reactions";
import { ALLOWED_REACTIONS } from "@/lib/services/reactions";

export type ReactionBarProps = {
  activityLogId: string;
  counts: Record<string, number>;
  mine: string[];
};

type ReactionState = { counts: Record<string, number>; mine: string[] };

/**
 * Displays the three allowed reactions as tap targets. Shows the running
 * count next to each emoji and highlights the viewer's own reactions. Uses
 * useOptimistic so taps feel instant; the server action drives the
 * authoritative revalidation.
 */
export function ReactionBar({ activityLogId, counts, mine }: ReactionBarProps) {
  const [, start] = useTransition();
  const [state, applyOptimistic] = useOptimistic<ReactionState, string>(
    { counts, mine },
    (prev, emoji) => {
      const wasMine = prev.mine.includes(emoji);
      const nextMine = wasMine
        ? prev.mine.filter((e) => e !== emoji)
        : [...prev.mine, emoji];
      const nextCounts = { ...prev.counts };
      const curr = nextCounts[emoji] ?? 0;
      nextCounts[emoji] = Math.max(0, curr + (wasMine ? -1 : 1));
      return { counts: nextCounts, mine: nextMine };
    },
  );

  function onTap(emoji: string) {
    start(async () => {
      applyOptimistic(emoji);
      await toggleReactionAction(activityLogId, emoji);
    });
  }

  return (
    <div className="flex items-center gap-1">
      {ALLOWED_REACTIONS.map((emoji) => {
        const count = state.counts[emoji] ?? 0;
        const mineOn = state.mine.includes(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onTap(emoji)}
            className={
              "inline-flex items-center gap-1 h-7 rounded-full px-2 text-xs transition-colors " +
              (mineOn
                ? "bg-brand-50 text-brand-700 border border-brand-200"
                : "bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100")
            }
            aria-pressed={mineOn}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 ? <span>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
