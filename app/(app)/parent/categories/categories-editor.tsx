"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n/ru";
import {
  createCategoryAction,
  updateCategoryAction,
  archiveCategoryAction,
} from "./actions";

type Cat = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export function CategoriesEditor({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState<number | "">(
    categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 10 : 0,
  );
  const [edits, setEdits] = useState<Record<string, { name: string; sortOrder: number }>>({});

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) return;
    start(async () => {
      const res = await createCategoryAction({
        name: newName.trim(),
        sortOrder: newOrder === "" ? 0 : Number(newOrder),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewName("");
      router.refresh();
    });
  };

  const onSave = (cat: Cat) => {
    setError(null);
    const e = edits[cat.id];
    if (!e) return;
    start(async () => {
      const res = await updateCategoryAction({
        id: cat.id,
        name: e.name.trim(),
        sortOrder: e.sortOrder,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEdits((prev) => {
        const { [cat.id]: _omit, ...rest } = prev;
        return rest;
      });
      router.refresh();
    });
  };

  const onToggleActive = (cat: Cat) => {
    setError(null);
    start(async () => {
      const res = await updateCategoryAction({ id: cat.id, isActive: !cat.isActive });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const onArchive = (cat: Cat) => {
    setError(null);
    start(async () => {
      const res = await archiveCategoryAction(cat.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.categories.new}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 items-end">
            <div>
              <Label htmlFor="cat-name">{t.categories.name}</Label>
              <Input
                id="cat-name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div>
              <Label htmlFor="cat-order">{t.categories.order}</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={newOrder}
                onChange={(e) =>
                  setNewOrder(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <Button type="submit" disabled={pending}>
              {t.app.create}
            </Button>
          </form>
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <EmptyState title={t.categories.empty} />
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => {
            const e = edits[cat.id];
            const editing = Boolean(e);
            return (
              <li key={cat.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    {editing ? (
                      <>
                        <Input
                          value={e!.name}
                          onChange={(ev) =>
                            setEdits((p) => ({
                              ...p,
                              [cat.id]: { ...e!, name: ev.target.value },
                            }))
                          }
                          className="flex-1 min-w-[160px]"
                          maxLength={60}
                        />
                        <Input
                          type="number"
                          min={0}
                          className="w-24"
                          value={e!.sortOrder}
                          onChange={(ev) =>
                            setEdits((p) => ({
                              ...p,
                              [cat.id]: { ...e!, sortOrder: Number(ev.target.value || 0) },
                            }))
                          }
                        />
                        <Button size="sm" onClick={() => onSave(cat)} disabled={pending}>
                          {t.app.save}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEdits((p) => {
                              const { [cat.id]: _omit, ...rest } = p;
                              return rest;
                            })
                          }
                          disabled={pending}
                        >
                          {t.app.cancel}
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 font-medium text-slate-900 truncate">
                          {cat.name}
                        </span>
                        <span className="text-xs text-slate-500">#{cat.sortOrder}</span>
                        {!cat.isActive ? <Badge tone="neutral">{t.tasks.inactive}</Badge> : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEdits((p) => ({
                              ...p,
                              [cat.id]: { name: cat.name, sortOrder: cat.sortOrder },
                            }))
                          }
                        >
                          {t.app.edit}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onToggleActive(cat)}
                          disabled={pending}
                        >
                          {cat.isActive ? t.tasks.archive : t.tasks.restore}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onArchive(cat)}
                          disabled={pending}
                          title={t.categories.cannotDeleteWithTasks}
                        >
                          {t.app.delete}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
    </div>
  );
}
