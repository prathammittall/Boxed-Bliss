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
const ORDER_FORMSPREE_ENDPOINT = (process.env.NEXT_PUBLIC_FORMSPREE_ORDER_ENDPOINT ?? "").trim();
const UPI_ID = (process.env.NEXT_PUBLIC_UPI_ID ?? "").trim();
const UPI_NAME = (process.env.NEXT_PUBLIC_UPI_NAME ?? "Boxed Bliss").trim();
const UPI_QR_IMAGE = (process.env.NEXT_PUBLIC_UPI_QR_IMAGE ?? "").trim();

function formatOrderItemsForEmail(items: Array<{ productName: string; quantity: number; price: number; variantInfo?: string | null }>) {
  return items
    .map((item, index) => {
      const lineTotal = Number(item.price) * Number(item.quantity);
      return [
        `${index + 1}. ${item.productName}`,
        `   Quantity: ${item.quantity}`,
        `   Unit Price: ${item.price}`,
        `   Line Total: ${lineTotal.toFixed(2)}`,
        `   Variant: ${item.variantInfo ?? "N/A"}`,
      ].join("\n");
    })
    .join("\n\n");
}

async function notifyOrderOnFormspree(order: {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress: string;
  city: string;
  state?: string | null;
  pincode: string;
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  status: string;
  notes?: string | null;
  items: Array<{ productName: string; quantity: number; price: number; variantInfo?: string | null; image?: string | null }>;
}) {
  if (!ORDER_FORMSPREE_ENDPOINT) return;

  const message = [
    `Order ID: ${order.id}`,
    `Customer Name: ${order.customerName}`,
    `Customer Email: ${order.customerEmail}`,
    `Customer Phone: ${order.customerPhone ?? "N/A"}`,
    `Address: ${order.shippingAddress}, ${order.city}${order.state ? `, ${order.state}` : ""} - ${order.pincode}`,
    `Subtotal: ${order.subtotal}`,
    `Discount: ${order.discount}`,
    `Total: ${order.total}`,
    `Coupon: ${order.couponCode ?? "N/A"}`,
    `Status: ${order.status}`,
    `Notes: ${order.notes ?? "N/A"}`,
    "",
    "Items:",
    formatOrderItemsForEmail(order.items),
  ].join("\n");

  const payload = {
    _subject: `New Boxed Bliss Order #${order.id}`,
    orderId: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone ?? "",
    shippingAddress: order.shippingAddress,
    city: order.city,
    state: order.state ?? "",
    pincode: order.pincode,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    couponCode: order.couponCode ?? "",
    orderStatus: order.status,
    notes: order.notes ?? "",
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      lineTotal: Number(item.price) * Number(item.quantity),
      variantInfo: item.variantInfo ?? null,
      image: item.image ?? null,
    })),
    message,
  };

  const response = await fetch(ORDER_FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Formspree order notification failed (${response.status}): ${body}`);
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
  const [paymentScreenshotFile, setPaymentScreenshotFile] = useState<File | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofPublicId, setPaymentProofPublicId] = useState("");
  const [paymentUploadState, setPaymentUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [paymentUploadMessage, setPaymentUploadMessage] = useState("");

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

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [checkoutItems]
  );
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  const upiIntentUrl = useMemo(() => {
    if (!UPI_ID) return "";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: UPI_NAME,
      tn: "Boxed Bliss Order Payment",
      cu: "INR",
      am: total.toFixed(2),
    });
    return `upi://pay?${params.toString()}`;
  }, [total]);

  const upiQrCodeUrl = useMemo(() => {
    if (UPI_QR_IMAGE) return UPI_QR_IMAGE;
    if (!upiIntentUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(upiIntentUrl)}`;
  }, [upiIntentUrl]);

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

  function handlePaymentScreenshotChange(file: File | null) {
    setPaymentScreenshotFile(file);
    setPaymentProofUrl("");
    setPaymentProofPublicId("");
    setPaymentUploadState("idle");
    setPaymentUploadMessage(file ? "Screenshot selected. It will be uploaded before placing the order." : "");
  }

  async function uploadPaymentProofIfNeeded() {
    if (paymentProofUrl && paymentProofPublicId) {
      return { paymentProofUrl, paymentProofPublicId };
    }

    if (!paymentScreenshotFile) {
      throw new Error("Please upload your UPI payment screenshot before placing the order.");
    }

    setPaymentUploadState("uploading");
    setPaymentUploadMessage("Uploading payment screenshot...");

    const formData = new FormData();
    formData.append("image", paymentScreenshotFile);

    const upload = await api.uploadPaymentProof(formData);
    setPaymentProofUrl(upload.url);
    setPaymentProofPublicId(upload.publicId);
    setPaymentUploadState("uploaded");
    setPaymentUploadMessage("Payment screenshot uploaded successfully.");

    return { paymentProofUrl: upload.url, paymentProofPublicId: upload.publicId };
  }

  async function handlePlaceOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const paymentProof = await uploadPaymentProofIfNeeded();

      const order = await api.createOrder({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        shippingAddress,
        city,
        state: state || undefined,
        pincode,
        paymentMethod: "UPI",
        paymentProofUrl: paymentProof.paymentProofUrl,
        paymentProofPublicId: paymentProof.paymentProofPublicId,
        couponCode: discount > 0 ? couponCode.trim().toUpperCase() : undefined,
        notes: notes || undefined,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantInfo: item.variantInfo ?? undefined,
        })),
      });

      setOrderId(order.id);
      setOrderTrackingEmail(customerEmail);

      try {
        await notifyOrderOnFormspree(order);
      } catch (notifyError) {
        // Checkout success should not be blocked by notification delivery failures.
        console.error("Frontend Formspree order notification failed:", notifyError);
      }

      setSubmitState("success");
      form.reset();
      setCouponCode("");
      setDiscount(0);
      setCouponMessage("");
      setPaymentScreenshotFile(null);
      setPaymentProofUrl("");
      setPaymentProofPublicId("");
      setPaymentUploadState("idle");
      setPaymentUploadMessage("");
      if (isCartMode) {
        clearCartItems();
        setCheckoutItems([]);
      } else {
        setCheckoutItems((prev) => prev.map((item) => ({ ...item, quantity: 1 })));
      }
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
                        <div className="flex gap-3">
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
                            <div className="mt-3 flex items-center gap-2">
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
              <div className="rounded-xl border border-rose-line/80 bg-white/65 p-4">
                <p className="text-sm font-medium text-rose-ink">Pay Online via UPI</p>
                <p className="mt-1 text-xs leading-5 text-rose-muted">
                  Scan the QR code and complete payment of Rs. {total.toFixed(2)} before placing your order.
                </p>
                <p className="mt-1 text-xs text-rose-muted">UPI ID: {UPI_ID || "Please configure NEXT_PUBLIC_UPI_ID"}</p>

                {upiQrCodeUrl ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-rose-line/80 bg-white p-2">
                    <img
                      src={upiQrCodeUrl}
                      alt="UPI QR code"
                      className="mx-auto h-64 w-64 rounded-lg object-contain sm:h-72 sm:w-72"
                    />
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-rose-line/80 bg-white/70 p-3 text-xs text-rose-muted">
                    QR code is unavailable. Set NEXT_PUBLIC_UPI_ID or NEXT_PUBLIC_UPI_QR_IMAGE in frontend env.
                  </p>
                )}

                {upiIntentUrl ? (
                  <a href={upiIntentUrl} className="mt-3 inline-flex text-xs text-rose-ink underline">
                    Open UPI app on this device
                  </a>
                ) : null}

                <div className="mt-4">
                  <label htmlFor="paymentScreenshot" className="text-xs text-rose-muted">
                    Upload payment confirmation screenshot *
                  </label>
                  <input
                    id="paymentScreenshot"
                    name="paymentScreenshot"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    required
                    onChange={(event) => handlePaymentScreenshotChange(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-3 py-2 text-sm outline-none"
                  />
                  {paymentUploadMessage ? (
                    <p className="mt-2 text-xs text-rose-muted">{paymentUploadMessage}</p>
                  ) : null}
                  {paymentUploadState === "uploading" ? (
                    <p className="mt-1 text-xs text-rose-muted">Uploading to secure storage...</p>
                  ) : null}
                </div>
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

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={checkoutItems.length === 0 || submitState === "submitting"}
                >
                  {submitState === "submitting" ? "Placing order..." : "Place order"}
                </button>
                {submitState === "success" ? (
                  <div className="text-sm text-rose-ink">
                    <p>Order placed successfully. ID: {orderId}. We have received your request details.</p>
                    <LoadingLink
                      href={`/order-status?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(orderTrackingEmail)}`}
                      className="mt-2 inline-flex text-rose-muted underline hover:text-rose-ink"
                    >
                      Track this order
                    </LoadingLink>
                  </div>
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
