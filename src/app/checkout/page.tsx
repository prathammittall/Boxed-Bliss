"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import { ApiError, api, type Product } from "@/lib/api";
import {
  clearCartItems,
  getCartItemKey,
  getCartItems,
  removeCartItem,
  type CartItem,
  updateCartItemQuantity,
} from "@/lib/cart";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (eventName: string, callback: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product") ?? "";
  const isCartMode = !productSlug;

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderTrackingEmail, setOrderTrackingEmail] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCheckoutItems() {
      setLoadingItems(true);
      setError("");

      try {
        if (isCartMode) {
          const items = getCartItems();
          if (!active) return;
          setCheckoutItems(items);
          if (items.length === 0) {
            setError("Your cart is empty. Add products from the shop to place a collective order.");
          }
          return;
        }

        const product: Product = await api.getProduct(productSlug);
        if (!active) return;
        setCheckoutItems([
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images?.[0] ?? null,
            quantity: 1,
            variantInfo: null,
          },
        ]);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load checkout items.");
      } finally {
        if (active) setLoadingItems(false);
      }
    }

    loadCheckoutItems();
    return () => {
      active = false;
    };
  }, [isCartMode, productSlug]);

  useEffect(() => {
    let active = true;

    if (typeof window === "undefined") return;
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      if (!active) return;
      setRazorpayReady(true);
    };

    script.onerror = () => {
      if (!active) return;
      setRazorpayReady(false);
      setError("Payment gateway failed to load. Please refresh and try again.");
    };

    document.body.appendChild(script);

    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [checkoutItems]
  );
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  function handleQuantityChange(itemKey: string, quantity: number) {
    const nextQuantity = Math.max(1, Number(quantity) || 1);
    setCheckoutItems((prev) =>
      prev.map((item) =>
        getCartItemKey(item) === itemKey
          ? {
              ...item,
              quantity: nextQuantity,
            }
          : item
      )
    );

    if (isCartMode) {
      updateCartItemQuantity(itemKey, nextQuantity);
    }
  }

  function handleRemoveItem(itemKey: string) {
    setCheckoutItems((prev) => prev.filter((item) => getCartItemKey(item) !== itemKey));
    if (isCartMode) {
      removeCartItem(itemKey);
    }
  }

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

    if (!window.Razorpay || !razorpayReady) {
      setSubmitState("error");
      setError("Payment gateway is not ready yet. Please try again in a few seconds.");
      return;
    }

    if (checkoutItems.length === 0) {
      setSubmitState("error");
      setError("Your cart is empty.");
      return;
    }

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
      const session = await api.createRazorpayOrder({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        shippingAddress,
        city,
        state: state || undefined,
        pincode,
        couponCode: discount > 0 ? couponCode.trim().toUpperCase() : undefined,
        notes: notes || undefined,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantInfo: item.variantInfo ?? undefined,
        })),
      });

      const razorpay = new window.Razorpay({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        name: session.name,
        description: session.description,
        order_id: session.orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone || undefined,
        },
        theme: { color: "#b77693" },
        modal: {
          ondismiss: () => {
            setSubmitState("idle");
          },
        },
        handler: async (response) => {
          setSubmitState("submitting");
          setError("");

          try {
            const order = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setOrderId(order.id);
            setOrderTrackingEmail(customerEmail);
            setSubmitState("success");

            form.reset();
            setCouponCode("");
            setDiscount(0);
            setCouponMessage("");

            if (isCartMode) {
              clearCartItems();
              setCheckoutItems([]);
            } else {
              setCheckoutItems((prev) => prev.map((item) => ({ ...item, quantity: 1 })));
            }
          } catch (err) {
            setSubmitState("error");
            setError(err instanceof ApiError ? err.message : "Payment verification failed. Please contact support.");
          }
        },
      });

      razorpay.on("payment.failed", () => {
        setSubmitState("error");
        setError("Payment was not completed. Please try again.");
      });

      razorpay.open();
      setSubmitState("idle");
    } catch (err) {
      setSubmitState("error");
      setError(err instanceof ApiError ? err.message : "Could not initiate payment.");
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

            {loadingItems ? <p className="mt-3 text-sm text-rose-muted">Loading selected products...</p> : null}
            {!loadingItems && checkoutItems.length === 0 ? (
              <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/65 p-4 text-sm text-rose-muted">
                {error || "No products selected."}
                <div className="mt-3">
                  <LoadingLink href="/shop" className="btn-ghost">
                    Back to shop
                  </LoadingLink>
                </div>
              </div>
            ) : null}

            {checkoutItems.length > 0 ? (
              <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/65 p-4">
                <p className="text-sm font-medium text-rose-ink">
                  {isCartMode ? "Collective order summary" : "Selected product"}
                </p>

                <div className="mt-3 grid gap-3">
                  {checkoutItems.map((item) => {
                    const itemKey = getCartItemKey(item);
                    return (
                      <div key={itemKey} className="rounded-xl border border-rose-line/80 bg-white/60 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/70 bg-rose-soft">
                            <Image
                              src={item.image || FALLBACK_IMAGE}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-rose-ink">{item.name}</p>
                            <p className="text-xs text-rose-muted">Rs. {item.price.toFixed(2)} each</p>
                            {item.variantInfo ? (
                              <p className="mt-1 text-xs text-rose-muted">Variant: {item.variantInfo}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <label htmlFor={`qty-${itemKey}`} className="text-xs text-rose-muted">
                                Qty
                              </label>
                              <input
                                id={`qty-${itemKey}`}
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(event) => handleQuantityChange(itemKey, Number(event.target.value))}
                                className="w-20 rounded-lg border border-rose-line/80 bg-white px-3 py-2 text-sm outline-none"
                              />
                              {isCartMode ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(itemKey)}
                                  className="text-xs text-rose-muted underline"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 rounded-xl border border-rose-line/80 bg-white/60 p-3 text-sm text-rose-muted">
                  <p>Subtotal: Rs. {subtotal.toFixed(2)}</p>
                  <p>Discount: Rs. {discount.toFixed(2)}</p>
                  <p className="font-medium text-rose-ink">Total: Rs. {total.toFixed(2)}</p>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
              <div className="rounded-xl border border-rose-line/80 bg-white/65 p-4">
                <p className="text-sm font-medium text-rose-ink">Pay securely with Razorpay</p>
                <p className="mt-1 text-xs leading-5 text-rose-muted">
                  You will be redirected to Razorpay Checkout to pay Rs. {total.toFixed(2)} safely using UPI, cards, netbanking, or wallet.
                </p>
                {!razorpayReady ? (
                  <p className="mt-2 text-xs text-rose-muted">Loading payment gateway...</p>
                ) : null}
              </div>

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

              <div className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={checkoutItems.length === 0 || submitState === "submitting" || !razorpayReady}
                >
                  {submitState === "submitting" ? "Processing..." : "Pay Now"}
                </button>
                {submitState === "success" ? (
                  <div className="text-sm text-rose-ink">
                    <p>Payment successful. Order confirmed with ID: {orderId}.</p>
                    <LoadingLink
                      href={`/order-status?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(orderTrackingEmail)}`}
                      className="mt-2 inline-flex text-rose-muted underline hover:text-rose-ink"
                    >
                      Track this order
                    </LoadingLink>
                  </div>
                ) : null}
                {submitState === "error" ? (
                  <p className="text-sm text-rose-muted">{error || "Checkout failed."}</p>
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
