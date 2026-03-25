"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import { ApiError, api, type Product } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product") ?? "";

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [discount, setDiscount] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!productSlug) {
        if (active) {
          setLoadingProduct(false);
          setError("Please select a product before checkout.");
        }
        return;
      }

      setLoadingProduct(true);
      setError("");
      try {
        const result = await api.getProduct(productSlug);
        if (!active) return;
        setProduct(result);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load product.");
      } finally {
        if (active) setLoadingProduct(false);
      }
    }

    loadProduct();
    return () => {
      active = false;
    };
  }, [productSlug]);

  const subtotal = useMemo(() => (product ? product.price * quantity : 0), [product, quantity]);
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  async function handleValidateCoupon() {
    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code.");
      setDiscount(0);
      return;
    }

    try {
      const result = await api.validateCoupon(couponCode.trim(), subtotal);
      if (result.valid) {
        setDiscount(result.discount ?? 0);
        setCouponMessage("Coupon applied successfully.");
      } else {
        setDiscount(0);
        setCouponMessage(result.error || "Coupon is not valid.");
      }
    } catch (err) {
      setDiscount(0);
      setCouponMessage(err instanceof ApiError ? err.message : "Coupon validation failed.");
    }
  }

  async function handlePlaceOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const customerName = String(formData.get("customerName") ?? "").trim();
    const customerEmail = String(formData.get("customerEmail") ?? "").trim();
    const customerPhone = String(formData.get("customerPhone") ?? "").trim();
    const shippingAddress = String(formData.get("shippingAddress") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const pincode = String(formData.get("pincode") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!customerName || !customerEmail || !shippingAddress || !city || !pincode) {
      setSubmitState("error");
      setError("Please fill all required delivery fields.");
      return;
    }

    setSubmitState("submitting");
    setError("");

    try {
      const order = await api.createOrder({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        shippingAddress,
        city,
        state: state || undefined,
        pincode,
        couponCode: discount > 0 ? couponCode.trim().toUpperCase() : undefined,
        notes: notes || undefined,
        items: [
          {
            productId: product.id,
            quantity,
            variantInfo: selectedVariant || undefined,
          },
        ],
      });

      setOrderId(order.id);
      setSubmitState("success");
      form.reset();
      setCouponCode("");
      setDiscount(0);
      setCouponMessage("");
      setQuantity(1);
      setSelectedVariant("");
    } catch (err) {
      setSubmitState("error");
      setError(err instanceof ApiError ? err.message : "Could not place order.");
    }
  }

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="soft-panel p-5 sm:p-6">
            <p className="kicker">Checkout</p>
            <h1 className="mt-2 font-display text-4xl text-rose-ink">Complete your order</h1>

            {loadingProduct ? <p className="mt-3 text-sm text-rose-muted">Loading selected product...</p> : null}
            {!loadingProduct && !product ? (
              <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/65 p-4 text-sm text-rose-muted">
                {error || "No product selected."}
                <div className="mt-3">
                  <LoadingLink href="/shop" className="btn-ghost">Back to shop</LoadingLink>
                </div>
              </div>
            ) : null}

            {product ? (
              <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/65 p-4">
                <div className="flex gap-3">
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/70 bg-rose-soft">
                    <Image
                      src={product.images[0] || FALLBACK_IMAGE}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-rose-ink">{product.name}</p>
                    <p className="text-xs text-rose-muted">Rs. {product.price.toFixed(2)} each</p>
                    <div className="mt-3 flex items-center gap-2">
                      <label htmlFor="qty" className="text-xs text-rose-muted">Qty</label>
                      <input
                        id="qty"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                        className="w-20 rounded-lg border border-rose-line/80 bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                {product.variants?.length ? (
                  <div className="mt-4">
                    <label className="text-xs text-rose-muted">Variant</label>
                    <select
                      value={selectedVariant}
                      onChange={(event) => setSelectedVariant(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
                    >
                      <option value="">Select variant (optional)</option>
                      {product.variants.map((variant) => (
                        <option key={variant.id} value={`${variant.label}: ${variant.value}`}>
                          {variant.label}: {variant.value}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 rounded-xl border border-rose-line/80 bg-white/60 p-3 text-sm text-rose-muted">
                  <p>Subtotal: Rs. {subtotal.toFixed(2)}</p>
                  <p>Discount: Rs. {discount.toFixed(2)}</p>
                  <p className="font-medium text-rose-ink">Total: Rs. {total.toFixed(2)}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Coupon code"
                    className="w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none"
                  />
                  <button type="button" className="btn-ghost" onClick={handleValidateCoupon}>
                    Apply
                  </button>
                </div>
                {couponMessage ? <p className="mt-2 text-xs text-rose-muted">{couponMessage}</p> : null}
              </div>
            ) : null}
          </article>

          <article className="soft-panel p-5 sm:p-6">
            <h2 className="font-display text-3xl text-rose-ink">Delivery details</h2>
            <form className="mt-4 grid gap-3" onSubmit={handlePlaceOrder}>
              <input name="customerName" placeholder="Full name *" required className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
              <input name="customerEmail" type="email" placeholder="Email *" required className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
              <input name="customerPhone" type="tel" placeholder="Phone" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
              <textarea name="shippingAddress" placeholder="Shipping address *" required rows={3} className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="city" placeholder="City *" required className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
                <input name="state" placeholder="State" className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
              </div>
              <input name="pincode" placeholder="Pincode *" required className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />
              <textarea name="notes" placeholder="Notes (optional)" rows={3} className="rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none" />

              <div className="mt-2 flex items-center gap-3">
                <button type="submit" className="btn-primary" disabled={!product || submitState === "submitting"}>
                  {submitState === "submitting" ? "Placing order..." : "Place order"}
                </button>
                {submitState === "success" ? (
                  <p className="text-sm text-rose-ink">Order placed successfully. ID: {orderId}</p>
                ) : null}
                {submitState === "error" ? (
                  <p className="text-sm text-rose-muted">{error || "Order placement failed."}</p>
                ) : null}
              </div>
            </form>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="overflow-x-hidden bg-rose-paper">
          <Navbar />
          <main className="site-shell pb-16 pt-16 sm:pt-16">
            <section className="mt-8">
              <article className="soft-panel p-6 text-sm text-rose-muted">Loading checkout...</article>
            </section>
          </main>
          <Footer />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
