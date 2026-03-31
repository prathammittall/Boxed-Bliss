"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type Order } from "@/lib/api";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

function formatCurrency(value: number) {
  return `Rs. ${value.toFixed(2)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [collapsedOrderIds, setCollapsedOrderIds] = useState<Set<string>>(new Set());

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

  function toggleOrderDetails(orderId: string) {
    setCollapsedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
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
              orders.map((order) => {
                const isCollapsed = collapsedOrderIds.has(order.id);

                return (
                <div key={order.id} className="rounded-xl border border-rose-line/80 bg-white/65 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-rose-ink">
                        Order #{order.id.slice(-8).toUpperCase()} • {order.customerName}
                      </p>
                      <p className="text-xs text-rose-muted">
                        {order.customerEmail} • {order.items.length} item(s) • {formatCurrency(order.total)}
                      </p>
                    </div>

                    <select
                      value={order.status}
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      className="w-full rounded-lg border border-rose-line/80 bg-white px-3 py-2 text-xs text-rose-ink outline-none sm:w-auto"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleOrderDetails(order.id)}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-rose-ink"
                  >
                    <span aria-hidden="true">{isCollapsed ? ">" : "v"}</span>
                    <span>{isCollapsed ? "Maximize order details" : "Minimize order details"}</span>
                  </button>

                  {!isCollapsed ? (
                  <div className="mt-4 grid gap-3 text-xs text-rose-ink sm:grid-cols-2">
                    <div className="rounded-lg border border-rose-line/70 bg-white/70 p-3">
                      <p className="font-semibold text-rose-ink">Order Details</p>
                      <p className="mt-1 text-rose-muted">Order ID: {order.id}</p>
                      <p className="text-rose-muted">Placed: {formatDate(order.createdAt)}</p>
                      <p className="text-rose-muted">Status: {order.status}</p>
                    </div>

                    <div className="rounded-lg border border-rose-line/70 bg-white/70 p-3">
                      <p className="font-semibold text-rose-ink">Customer</p>
                      <p className="mt-1 text-rose-muted">Name: {order.customerName}</p>
                      <p className="text-rose-muted">Email: {order.customerEmail}</p>
                      <p className="text-rose-muted">Phone: {order.customerPhone || "N/A"}</p>
                    </div>

                    <div className="rounded-lg border border-rose-line/70 bg-white/70 p-3 sm:col-span-2">
                      <p className="font-semibold text-rose-ink">Shipping Address</p>
                      <p className="mt-1 text-rose-muted">
                        {order.shippingAddress}, {order.city}
                        {order.state ? `, ${order.state}` : ""} - {order.pincode}
                      </p>
                    </div>

                    <div className="rounded-lg border border-rose-line/70 bg-white/70 p-3 sm:col-span-2">
                      <p className="font-semibold text-rose-ink">Pricing</p>
                      <div className="mt-1 grid gap-1 text-rose-muted sm:grid-cols-2">
                        <p>Subtotal: {formatCurrency(order.subtotal)}</p>
                        <p>Discount: {formatCurrency(order.discount)}</p>
                        <p>Total: {formatCurrency(order.total)}</p>
                        <p>Coupon: {order.couponCode || "N/A"}</p>
                        <p>Payment Method: {order.paymentMethod || "N/A"}</p>
                        {order.paymentProofUrl ? (
                          <a
                            href={order.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-ink underline"
                          >
                            View payment screenshot
                          </a>
                        ) : (
                          <p>Payment Screenshot: N/A</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-rose-line/70 bg-white/70 p-3 sm:col-span-2">
                      <p className="font-semibold text-rose-ink">Notes</p>
                      <p className="mt-1 text-rose-muted">{order.notes || "No notes."}</p>
                    </div>

                    <div className="rounded-lg border border-rose-line/70 bg-white/70 p-3 sm:col-span-2">
                      <p className="font-semibold text-rose-ink">Items</p>
                      <div className="mt-2 grid gap-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-rose-line/60 bg-white/80 p-2 text-rose-muted"
                          >
                            <p className="font-medium text-rose-ink">{item.productName}</p>
                            <p>Product ID: {item.productId}</p>
                            <p>Item ID: {item.id}</p>
                            <p>Quantity: {item.quantity}</p>
                            <p>Unit Price: {formatCurrency(item.price)}</p>
                            <p>Line Total: {formatCurrency(item.price * item.quantity)}</p>
                            <p>Variant: {item.variantInfo || "N/A"}</p>
                            <p>Image URL: {item.image || "N/A"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  ) : null}
                </div>
              );
              })
            )}
          </div>
        ) : null}
      </article>
    </section>
  );
}
