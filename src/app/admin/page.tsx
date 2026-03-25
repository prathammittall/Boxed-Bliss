"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type Analytics } from "@/lib/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await api.getAnalytics();
        if (!active) return;
        setData(result);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="grid gap-5">
      <article className="soft-panel p-5 sm:p-6">
        <p className="kicker">Overview</p>
        <h2 className="mt-2 font-display text-4xl text-rose-ink">Dashboard</h2>
        <p className="mt-2 text-sm text-rose-muted">Live store metrics from the backend.</p>
      </article>

      {loading ? <article className="soft-panel p-5 text-sm text-rose-muted">Loading analytics...</article> : null}
      {error ? <article className="soft-panel p-5 text-sm text-rose-muted">{error}</article> : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="soft-panel p-5">
              <p className="kicker">Products</p>
              <p className="mt-2 font-display text-4xl text-rose-ink">{data.products.total}</p>
            </article>
            <article className="soft-panel p-5">
              <p className="kicker">Orders</p>
              <p className="mt-2 font-display text-4xl text-rose-ink">{data.orders.total}</p>
            </article>
            <article className="soft-panel p-5">
              <p className="kicker">Revenue</p>
              <p className="mt-2 font-display text-4xl text-rose-ink">Rs. {data.revenue.total.toFixed(2)}</p>
            </article>
            <article className="soft-panel p-5">
              <p className="kicker">Unread Contacts</p>
              <p className="mt-2 font-display text-4xl text-rose-ink">{data.contacts.unread}</p>
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="soft-panel p-5">
              <p className="kicker">Order Status</p>
              <ul className="mt-4 grid gap-2 text-sm text-rose-muted">
                <li>Pending: {data.orders.byStatus.pending}</li>
                <li>Confirmed: {data.orders.byStatus.confirmed}</li>
                <li>Shipped: {data.orders.byStatus.shipped}</li>
                <li>Delivered: {data.orders.byStatus.delivered}</li>
                <li>Cancelled: {data.orders.byStatus.cancelled}</li>
              </ul>
            </article>

            <article className="soft-panel p-5">
              <p className="kicker">Recent Orders</p>
              <div className="mt-4 grid gap-2">
                {data.recentOrders.length === 0 ? (
                  <p className="text-sm text-rose-muted">No recent orders.</p>
                ) : (
                  data.recentOrders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-rose-line/80 bg-white/60 p-3">
                      <p className="text-sm font-medium text-rose-ink">{order.customerName}</p>
                      <p className="text-xs text-rose-muted">{order.status} • Rs. {order.total.toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
