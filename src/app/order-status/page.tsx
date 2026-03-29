"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ApiError, api, type Order } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

function getStatusStep(status: string): number {
  const normalized = status.toUpperCase();
  const index = STATUS_ORDER.indexOf(normalized as (typeof STATUS_ORDER)[number]);
  return index >= 0 ? index : 0;
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<OrderStatusFallback />}>
      <OrderStatusContent />
    </Suspense>
  );
}

function OrderStatusFallback() {
  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
          <article className="soft-panel p-5 sm:p-6">
            <p className="kicker">Order tracking</p>
            <h1 className="mt-2 font-display text-4xl text-rose-ink">Track your order</h1>
            <p className="mt-3 text-sm text-rose-muted">Loading order tracker...</p>
          </article>

          <article className="soft-panel p-5 sm:p-6">
            <h2 className="font-display text-3xl text-rose-ink">Current progress</h2>
            <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/60 p-4 text-sm text-rose-muted">
              Loading order details...
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId") ?? "";
  const initialEmail = searchParams.get("email") ?? "";

  const [orderId, setOrderId] = useState(initialOrderId);
  const [email, setEmail] = useState(initialEmail);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    setOrderId(initialOrderId);
    setEmail(initialEmail);
  }, [initialOrderId, initialEmail]);

  async function fetchOrder(nextOrderId: string, nextEmail: string) {
    setSubmitState("loading");
    setError("");

    try {
      const result = await api.trackOrder({
        orderId: nextOrderId.trim(),
        email: nextEmail.trim(),
      });
      setOrder(result);
      setSubmitState("done");
    } catch (err) {
      setOrder(null);
      setSubmitState("error");
      setError(err instanceof ApiError ? err.message : "Could not fetch order status.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderId.trim() || !email.trim()) {
      setSubmitState("error");
      setError("Please provide both order ID and email.");
      return;
    }

    await fetchOrder(orderId, email);
  }

  useEffect(() => {
    if (!initialOrderId || !initialEmail) return;
    void fetchOrder(initialOrderId, initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = useMemo(() => getStatusStep(order?.status ?? "PENDING"), [order?.status]);

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
          <article className="soft-panel p-5 sm:p-6">
            <p className="kicker">Order tracking</p>
            <h1 className="mt-2 font-display text-4xl text-rose-ink">Track your order</h1>
            <p className="mt-3 text-sm text-rose-muted">
              Enter your order ID and the same email used at checkout.
            </p>

            <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
              <input
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="Order ID"
                className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email used at checkout"
                className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
              />
              <div className="mt-1 flex items-center gap-3">
                <button type="submit" className="btn-primary" disabled={submitState === "loading"}>
                  {submitState === "loading" ? "Checking..." : "Check status"}
                </button>
                {submitState === "error" ? <p className="text-sm text-rose-muted">{error}</p> : null}
              </div>
            </form>
          </article>

          <article className="soft-panel p-5 sm:p-6">
            <h2 className="font-display text-3xl text-rose-ink">Current progress</h2>

            {order ? (
              <>
                <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/60 p-4 text-sm text-rose-muted">
                  <p className="text-rose-ink">Order ID: {order.id}</p>
                  <p>Placed by: {order.customerName}</p>
                  <p>Status: {order.status}</p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-5">
                  {STATUS_ORDER.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    return (
                      <div
                        key={step}
                        className={`rounded-xl border px-3 py-3 text-center text-[0.68rem] uppercase tracking-[0.14em] ${
                          isDone
                            ? "border-rose-accent/70 bg-rose-accent/15 text-rose-ink"
                            : "border-rose-line/80 bg-white/55 text-rose-muted"
                        }`}
                      >
                        {step}
                      </div>
                    );
                  })}
                </div>

                {order.status === "CANCELLED" || order.status === "REFUNDED" ? (
                  <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/60 p-4 text-sm text-rose-muted">
                    This order is currently marked as {order.status.toLowerCase()}.
                  </div>
                ) : null}

                <div className="mt-5 rounded-xl border border-rose-line/80 bg-white/60 p-4">
                  <h3 className="text-sm font-medium text-rose-ink">Items</h3>
                  <div className="mt-3 grid gap-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-rose-line/80 bg-white/60 p-3">
                        <div className="flex gap-3">
                          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/70 bg-rose-soft">
                            <Image
                              src={item.image || FALLBACK_IMAGE}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-rose-ink">{item.productName}</p>
                            <p className="text-xs text-rose-muted">Qty: {item.quantity}</p>
                            <p className="text-xs text-rose-muted">Price: Rs. {Number(item.price).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 rounded-xl border border-rose-line/80 bg-white/60 p-4 text-sm text-rose-muted">
                  <p>Subtotal: Rs. {Number(order.subtotal).toFixed(2)}</p>
                  <p>Discount: Rs. {Number(order.discount).toFixed(2)}</p>
                  <p className="font-medium text-rose-ink">Total: Rs. {Number(order.total).toFixed(2)}</p>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/60 p-4 text-sm text-rose-muted">
                No order loaded yet. Submit your details to see live status.
              </div>
            )}
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
