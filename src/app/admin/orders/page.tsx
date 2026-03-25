"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type Order } from "@/lib/api";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      try {
        const result = await api.getOrders({ limit: 100 });
        if (!active) return;
        setOrders(result.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load orders.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, []);

  async function handleStatusChange(orderId: string, status: string) {
    try {
      await api.updateOrder(orderId, { status });
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update order status.");
    }
  }

  return (
    <section className="grid gap-5">
      <article className="soft-panel p-5 sm:p-6">
        <p className="kicker">Admin</p>
        <h2 className="mt-2 font-display text-4xl text-rose-ink">Orders</h2>
      </article>

      {error ? <article className="soft-panel p-4 text-sm text-rose-muted">{error}</article> : null}

      <article className="soft-panel p-5 sm:p-6">
        {loading ? <p className="text-sm text-rose-muted">Loading orders...</p> : null}
        {!loading ? (
          <div className="grid gap-3">
            {orders.length === 0 ? (
              <p className="text-sm text-rose-muted">No orders yet.</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-rose-line/80 bg-white/65 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-rose-ink">{order.customerName}</p>
                      <p className="text-xs text-rose-muted">
                        {order.customerEmail} • {order.items.length} item(s) • Rs. {order.total.toFixed(2)}
                      </p>
                    </div>

                    <select
                      value={order.status}
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      className="rounded-lg border border-rose-line/80 bg-white px-3 py-2 text-xs text-rose-ink outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
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
