"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, api, type Category, type Product } from "@/lib/api";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editComparePrice, setEditComparePrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInStock, setEditInStock] = useState(true);
  const [editFeatured, setEditFeatured] = useState(false);
  const [editOccasion, setEditOccasion] = useState(false);
  const [editMoreToExplore, setEditMoreToExplore] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getProducts({ limit: 100 });
      setProducts(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const result = await api.getCategoriesFlat();
      setCategories(result);
    } catch {
      setCategories([]);
    }
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") ?? "").trim();
    const slugInput = String(formData.get("slug") ?? "").trim();
    const priceValue = Number(formData.get("price") ?? 0);
    const categoryIdInput = String(formData.get("categoryId") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const imageFileEntry = formData.get("image");
    const imageFile = imageFileEntry instanceof File && imageFileEntry.size > 0 ? imageFileEntry : null;
    const inStock = formData.get("inStock") === "on";
    const featured = formData.get("featured") === "on";
    const occasion = formData.get("occasion") === "on";
    const moreToExplore = formData.get("moreToExplore") === "on";
    const slug = (slugInput || name).toLowerCase().replace(/\s+/g, "-");

    if (!name || !slug || Number.isNaN(priceValue) || priceValue < 0) {
      setError("Name, valid slug, and valid price are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await api.uploadImageFile(imageFile, "boxed-bliss/products");
      }

      await api.createProduct({
        name,
        slug,
        price: priceValue,
        description: description || undefined,
        categoryId: categoryIdInput || undefined,
        inStock,
        featured,
        occasion,
        moreToExplore,
        images: imageUrl ? [imageUrl] : [],
      });
      form.reset();
      await loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete product.");
    }
  }

  function startEdit(product: Product) {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditSlug(product.slug);
    setEditPrice(String(product.price));
    setEditComparePrice(product.comparePrice != null ? String(product.comparePrice) : "");
    setEditCategoryId(product.category?.id ?? "");
    setEditDescription(product.description ?? "");
    setEditInStock(product.inStock);
    setEditFeatured(product.featured);
    setEditOccasion(product.occasion ?? false);
    setEditMoreToExplore(product.moreToExplore ?? false);
  }

  function cancelEdit() {
    setEditingProductId(null);
    setEditName("");
    setEditSlug("");
    setEditPrice("");
    setEditComparePrice("");
    setEditCategoryId("");
    setEditDescription("");
    setEditInStock(true);
    setEditFeatured(false);
    setEditOccasion(false);
    setEditMoreToExplore(false);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProductId) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const imageFileEntry = formData.get("image");
    const imageFile = imageFileEntry instanceof File && imageFileEntry.size > 0 ? imageFileEntry : null;

    const name = editName.trim();
    const slug = editSlug.trim().toLowerCase().replace(/\s+/g, "-");
    const price = Number(editPrice);
    const comparePrice = editComparePrice.trim() ? Number(editComparePrice) : null;
    const description = editDescription.trim();

    if (!name || !slug || Number.isNaN(price) || price < 0) {
      setError("Name, valid slug, and valid price are required.");
      return;
    }
    if (comparePrice !== null && (Number.isNaN(comparePrice) || comparePrice < 0)) {
      setError("Compare price must be a valid non-negative number.");
      return;
    }

    const existingProduct = products.find((item) => item.id === editingProductId);
    const nextImages = existingProduct?.images ? [...existingProduct.images] : [];

    setSubmitting(true);
    setError("");
    try {
      if (imageFile) {
        const imageUrl = await api.uploadImageFile(imageFile, "boxed-bliss/products");
        if (nextImages.length > 0) {
          nextImages[0] = imageUrl;
        } else {
          nextImages.push(imageUrl);
        }
      }

      const updated = await api.updateProduct(editingProductId, {
        name,
        slug,
        price,
        comparePrice,
        categoryId: editCategoryId || null,
        description: description || null,
        inStock: editInStock,
        featured: editFeatured,
        occasion: editOccasion,
        moreToExplore: editMoreToExplore,
        images: nextImages,
      });

      setProducts((prev) => prev.map((item) => (item.id === editingProductId ? updated : item)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5">
      <article className="soft-panel p-5 sm:p-6">
        <p className="kicker">Admin</p>
        <h2 className="mt-2 font-display text-4xl text-rose-ink">Products</h2>
      </article>

      <article className="soft-panel p-5 sm:p-6">
        <h3 className="font-display text-3xl text-rose-ink">Add Product</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <input name="name" placeholder="Product name" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" required />
          <input name="slug" placeholder="Slug (optional)" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
          <input name="price" type="number" step="0.01" min="0" placeholder="Price" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" required />
          <select name="categoryId" defaultValue="" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink outline-none">
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input name="image" type="file" accept="image/*" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-rose-accent/20 file:px-3 file:py-1.5 file:text-xs file:font-medium" />
          <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
            <input name="inStock" type="checkbox" defaultChecked />
            In stock
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
            <input name="featured" type="checkbox" />
            Featured
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
            <input name="occasion" type="checkbox" />
            Occasion
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
            <input name="moreToExplore" type="checkbox" />
            More to explore
          </label>
          <textarea name="description" rows={3} placeholder="Description (optional)" className="md:col-span-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create product"}
            </button>
          </div>
        </form>
      </article>

      {editingProductId ? (
        <article className="soft-panel p-5 sm:p-6">
          <h3 className="font-display text-3xl text-rose-ink">Edit Product</h3>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleEdit}>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Product name"
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
              value={editPrice}
              onChange={(event) => setEditPrice(event.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="Price"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
              required
            />
            <input
              value={editComparePrice}
              onChange={(event) => setEditComparePrice(event.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="Compare price (optional)"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
            />
            <select
              value={editCategoryId}
              onChange={(event) => setEditCategoryId(event.target.value)}
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink outline-none"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-rose-accent/20 file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
            <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
              <input type="checkbox" checked={editInStock} onChange={(event) => setEditInStock(event.target.checked)} />
              In stock
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
              <input type="checkbox" checked={editFeatured} onChange={(event) => setEditFeatured(event.target.checked)} />
              Featured
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
              <input type="checkbox" checked={editOccasion} onChange={(event) => setEditOccasion(event.target.checked)} />
              Occasion
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm text-rose-ink">
              <input
                type="checkbox"
                checked={editMoreToExplore}
                onChange={(event) => setEditMoreToExplore(event.target.checked)}
              />
              More to explore
            </label>
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              placeholder="Description (optional)"
              className="md:col-span-2 rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
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
        <h3 className="font-display text-3xl text-rose-ink">All Products</h3>
        {loading ? <p className="mt-4 text-sm text-rose-muted">Loading products...</p> : null}
        {!loading ? (
          <div className="mt-4 grid gap-3">
            {products.length === 0 ? (
              <p className="text-sm text-rose-muted">No products yet.</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-line/80 bg-white/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-rose-ink">{product.name}</p>
                    <p className="text-xs text-rose-muted">
                      {product.slug} • Rs. {product.price.toFixed(2)}
                      {product.category?.name ? ` • ${product.category.name}` : ""}
                    </p>
                    <p className="text-xs text-rose-muted">
                      {product.inStock ? "In stock" : "Out of stock"} • {product.featured ? "Featured" : "Not featured"} •{" "}
                      {product.occasion ? "Occasion" : "No occasion"} • {product.moreToExplore ? "More to explore" : "Not in more to explore"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost" onClick={() => startEdit(product)}>
                      Edit
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => handleDelete(product.id)}>
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
