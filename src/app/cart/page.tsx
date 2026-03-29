"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import {
  CART_UPDATED_EVENT,
  clearCartItems,
  getCartItemKey,
  getCartItems,
  removeCartItem,
  type CartItem,
  updateCartItemQuantity,
} from "@/lib/cart";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    function refreshCart() {
      setItems(getCartItems());
    }

    refreshCart();
    window.addEventListener(CART_UPDATED_EVENT, refreshCart);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refreshCart);
    };
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  function handleQtyChange(itemKey: string, nextQty: number) {
    const quantity = Math.max(1, Number(nextQty) || 1);
    updateCartItemQuantity(itemKey, quantity);
    setItems(getCartItems());
  }

  function handleRemove(itemKey: string) {
    removeCartItem(itemKey);
    setItems(getCartItems());
  }

  function handleClear() {
    clearCartItems();
    setItems([]);
  }

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="soft-panel p-5 sm:p-6">
            <p className="kicker">Cart</p>
            <h1 className="mt-2 font-display text-4xl text-rose-ink">Your cart</h1>

            {items.length === 0 ? (
              <div className="mt-4 rounded-xl border border-rose-line/80 bg-white/65 p-4 text-sm text-rose-muted">
                Your cart is empty.
                <div className="mt-3">
                  <LoadingLink href="/shop" className="btn-ghost">
                    Continue shopping
                  </LoadingLink>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {items.map((item) => {
                  const itemKey = getCartItemKey(item);
                  return (
                    <div key={itemKey} className="rounded-xl border border-rose-line/80 bg-white/65 p-4">
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
                              onChange={(event) => handleQtyChange(itemKey, Number(event.target.value))}
                              className="w-20 rounded-lg border border-rose-line/80 bg-white px-3 py-2 text-sm outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemove(itemKey)}
                              className="text-xs text-rose-muted underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="soft-panel h-fit p-5 sm:p-6">
            <h2 className="font-display text-3xl text-rose-ink">Summary</h2>
            <div className="mt-4 grid gap-2 rounded-xl border border-rose-line/80 bg-white/65 p-3 text-sm text-rose-muted">
              <p>Items: {items.reduce((sum, item) => sum + item.quantity, 0)}</p>
              <p className="font-medium text-rose-ink">Subtotal: Rs. {subtotal.toFixed(2)}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <LoadingLink
                href={items.length === 0 ? "/cart" : "/checkout"}
                className={`btn-primary ${items.length === 0 ? "pointer-events-none opacity-60" : ""}`}
                aria-disabled={items.length === 0}
              >
                Proceed to checkout
              </LoadingLink>
              <button type="button" className="btn-ghost" onClick={handleClear} disabled={items.length === 0}>
                Clear cart
              </button>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
