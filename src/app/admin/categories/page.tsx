"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, api, type Category } from "@/lib/api";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCategoriesFlat();
      setCategories(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const slugInput = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const image = String(formData.get("image") ?? "").trim();
    const slug = (slugInput || name).toLowerCase().replace(/\s+/g, "-");

    if (!name || !slug) {
      setError("Name and slug are required.");
      return;
    }

    setError("");
    try {
      await api.createCategory({ name, slug, description: description || undefined, image: image || undefined });
      form.reset();
      await loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create category.");
    }
  }

  async function handleQuickRename(id: string, currentName: string) {
    const nextName = window.prompt("Rename category", currentName)?.trim();
    if (!nextName || nextName === currentName) return;

    try {
      await api.updateCategory(id, { name: nextName });
      setCategories((prev) => prev.map((item) => (item.id === id ? { ...item, name: nextName } : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update category.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete category.");
    }
  }

  return (
    <section className="grid gap-5">
      <article className="soft-panel p-5 sm:p-6">
        <p className="kicker">Admin</p>
        <h2 className="mt-2 font-display text-4xl text-rose-ink">Categories</h2>
      </article>

      <article className="soft-panel p-5 sm:p-6">
        <h3 className="font-display text-3xl text-rose-ink">Add Category</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <input name="name" placeholder="Category name" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" required />
          <input name="slug" placeholder="Slug (optional)" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
          <input name="image" placeholder="Image URL (optional)" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
          <textarea name="description" rows={3} placeholder="Description (optional)" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">Create category</button>
          </div>
        </form>
      </article>

      {error ? <article className="soft-panel p-4 text-sm text-rose-muted">{error}</article> : null}

      <article className="soft-panel p-5 sm:p-6">
        <h3 className="font-display text-3xl text-rose-ink">All Categories</h3>
        {loading ? <p className="mt-4 text-sm text-rose-muted">Loading categories...</p> : null}
        {!loading ? (
          <div className="mt-4 grid gap-2">
            {categories.length === 0 ? (
              <p className="text-sm text-rose-muted">No categories yet.</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-line/80 bg-white/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-rose-ink">{category.name}</p>
                    <p className="text-xs text-rose-muted">{category.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost" onClick={() => handleQuickRename(category.id, category.name)}>
                      Rename
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => handleDelete(category.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </article>
    </section>
  );
}
