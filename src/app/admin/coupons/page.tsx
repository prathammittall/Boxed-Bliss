"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, api, type Coupon } from "@/lib/api";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCoupons();
      setCoupons(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const code = String(formData.get("code") ?? "").trim();
    const value = Number(formData.get("value") ?? 0);
    const discountType = String(formData.get("discountType") ?? "PERCENT") as "PERCENT" | "FIXED";
    const description = String(formData.get("description") ?? "").trim();

    if (!code || Number.isNaN(value) || value <= 0) {
      setError("Coupon code and positive value are required.");
      return;
    }

    try {
      await api.createCoupon({
        code,
        value,
        discountType,
        description: description || undefined,
      });
      form.reset();
      await loadCoupons();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create coupon.");
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      const updated = await api.updateCoupon(id, { active: !active });
      setCoupons((prev) => prev.map((coupon) => (coupon.id === id ? updated : coupon)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update coupon.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteCoupon(id);
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete coupon.");
    }
  }

  return (
    <section className="grid gap-5">
      <article className="soft-panel p-5 sm:p-6">
        <p className="kicker">Admin</p>
        <h2 className="mt-2 font-display text-4xl text-rose-ink">Coupons</h2>
      </article>

      <article className="soft-panel p-5 sm:p-6">
        <h3 className="font-display text-3xl text-rose-ink">Create Coupon</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <input name="code" placeholder="Code" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" required />
          <input name="value" type="number" min="0.01" step="0.01" placeholder="Discount value" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" required />
          <select name="discountType" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none">
            <option value="PERCENT">PERCENT</option>
            <option value="FIXED">FIXED</option>
          </select>
          <input name="description" placeholder="Description (optional)" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">Create coupon</button>
          </div>
        </form>
      </article>

      {error ? <article className="soft-panel p-4 text-sm text-rose-muted">{error}</article> : null}

      <article className="soft-panel p-5 sm:p-6">
        <h3 className="font-display text-3xl text-rose-ink">All Coupons</h3>
        {loading ? <p className="mt-4 text-sm text-rose-muted">Loading coupons...</p> : null}
        {!loading ? (
          <div className="mt-4 grid gap-2">
            {coupons.length === 0 ? (
              <p className="text-sm text-rose-muted">No coupons yet.</p>
            ) : (
              coupons.map((coupon) => (
                <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-line/80 bg-white/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-rose-ink">{coupon.code}</p>
                    <p className="text-xs text-rose-muted">
                      {coupon.discountType} • {coupon.value} • {coupon.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost" onClick={() => handleToggle(coupon.id, coupon.active)}>
                      {coupon.active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => handleDelete(coupon.id)}>
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
