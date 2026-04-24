"use client";

import { useMemo } from "react";
import { TaskTile, type ChildTaskTileData } from "@/components/child/task-tile";
import { CategoryGroup } from "@/components/shared/category-group";

/**
 * Renders a list of child task tiles grouped by category, each group
 * collapsible. `scope` must be unique per containing section so "to do" and
 * "done today" don't share collapsed state (collapsing "Домашние дела" in the
 * todo list shouldn't also collapse it in the done list).
 */
export function TaskTileGroup({
  scope,
  tasks,
  dimmed = false,
}: {
  scope: string;
  tasks: ChildTaskTileData[];
  /** Apply the "done today" muted visual treatment to tiles. */
  dimmed?: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ChildTaskTileData[]>();
    for (const task of tasks) {
      if (!map.has(task.category)) map.set(task.category, []);
      map.get(task.category)!.push(task);
    }
    return Array.from(map.entries());
  }, [tasks]);

  return (
    <div className={"space-y-4" + (dimmed ? " opacity-80" : "")}>
      {grouped.map(([category, rows]) => (
        <CategoryGroup
          key={category}
          scope={scope}
          category={category}
          count={rows.length}
        >
          {rows.map((task) => (
            <TaskTile key={task.id} task={task} />
          ))}
        </CategoryGroup>
      ))}
    </div>
  );
}
