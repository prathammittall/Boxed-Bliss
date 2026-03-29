"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, api, type Category } from "@/lib/api";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");

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
    const imageFileEntry = formData.get("image");
    const imageFile = imageFileEntry instanceof File && imageFileEntry.size > 0 ? imageFileEntry : null;
    const slug = (slugInput || name).toLowerCase().replace(/\s+/g, "-");

    if (!name || !slug) {
      setError("Name and slug are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await api.uploadImageFile(imageFile, "boxed-bliss/categories");
      }

      await api.createCategory({
        name,
        slug,
        description: description || undefined,
        image: imageUrl,
      });
      form.reset();
      await loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create category.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(category: Category) {
    setEditingCategoryId(category.id);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditDescription(category.description ?? "");
    setEditImage(category.image ?? "");
  }

  function cancelEdit() {
    setEditingCategoryId(null);
    setEditName("");
    setEditSlug("");
    setEditDescription("");
    setEditImage("");
  }

  async function handleEditCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategoryId) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const imageFileEntry = formData.get("image");
    const imageFile = imageFileEntry instanceof File && imageFileEntry.size > 0 ? imageFileEntry : null;

    const name = editName.trim();
    const slug = editSlug.trim().toLowerCase().replace(/\s+/g, "-");
    const description = editDescription.trim();

    if (!name || !slug) {
      setError("Name and slug are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let nextImage = editImage || null;
      if (imageFile) {
        nextImage = await api.uploadImageFile(imageFile, "boxed-bliss/categories");
      }

      const updated = await api.updateCategory(editingCategoryId, {
        name,
        slug,
        description: description || null,
        image: nextImage,
      });

      setCategories((prev) => prev.map((item) => (item.id === editingCategoryId ? { ...item, ...updated } : item)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update category.");
    } finally {
      setSubmitting(false);
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
          <input
            name="image"
            type="file"
            accept="image/*"
            className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-rose-accent/20 file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
          <textarea name="description" rows={3} placeholder="Description (optional)" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create category"}
            </button>
          </div>
        </form>
      </article>

      {editingCategoryId ? (
        <article className="soft-panel p-5 sm:p-6">
          <h3 className="font-display text-3xl text-rose-ink">Edit Category</h3>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleEditCategory}>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Category name"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
              required
            />
            <input
              value={editSlug}
              onChange={(event) => setEditSlug(event.target.value)}
              placeholder="Slug"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
              required
            />
            <input
              name="image"
              type="file"
              accept="image/*"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-rose-accent/20 file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
            <input
              value={editImage}
              onChange={(event) => setEditImage(event.target.value)}
              placeholder="Image URL (optional)"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              placeholder="Description (optional)"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none md:col-span-2"
            />
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </article>
      ) : null}

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
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-rose-line/80 bg-white/70">
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-rose-muted">No image</div>
                      )}
                    </div>
                    <div>
                    <p className="text-sm font-medium text-rose-ink">{category.name}</p>
                    <p className="text-xs text-rose-muted">{category.slug}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(category)}>
                      Edit
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
