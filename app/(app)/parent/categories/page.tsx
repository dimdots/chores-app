import { requireParent } from "@/lib/auth/permissions";
import { listCategories } from "@/lib/services/categories";
import { CategoriesEditor } from "./categories-editor";
import { t } from "@/lib/i18n/ru";

export const dynamic = "force-dynamic";

export default async function ParentCategoriesPage() {
  await requireParent();
  const categories = await listCategories({});
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t.categories.title}</h1>
      <CategoriesEditor
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
