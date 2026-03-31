"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import {
  CART_DRAWER_OPEN_EVENT,
  CART_UPDATED_EVENT,
  clearCartItems,
  getCartItemKey,
  getCartItems,
  removeCartItem,
  type CartItem,
  updateCartItemQuantity,
} from "@/lib/cart";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

export default function HomeCartDrawer() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    function refreshCart() {
      setItems(getCartItems());
    }

    function handleOpen() {
      refreshCart();
      setOpen(true);
    }

    refreshCart();
    window.addEventListener(CART_UPDATED_EVENT, refreshCart);
    window.addEventListener(CART_DRAWER_OPEN_EVENT, handleOpen);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refreshCart);
      window.removeEventListener(CART_DRAWER_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

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
    <>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-55 bg-rose-ink/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        aria-label="Cart drawer"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-60 h-svh w-full max-w-full border-l border-rose-line/80 bg-rose-paper shadow-2xl transition-transform duration-300 md:w-[60%] lg:w-[40%] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-rose-line/80 px-4 sm:px-5">
          <div>
            <p className="kicker">Cart</p>
            <p className="text-sm text-rose-muted">{itemCount} item(s)</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-line/85 bg-white/70 text-rose-muted transition hover:text-rose-ink"
            aria-label="Close cart drawer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(100svh-4rem)] flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {items.length === 0 ? (
              <div className="rounded-xl border border-rose-line/80 bg-white/65 p-4 text-sm text-rose-muted">
                Your cart is empty.
                <div className="mt-3">
                  <LoadingLink href="/shop" className="btn-ghost" onClick={() => setOpen(false)}>
                    Continue shopping
                  </LoadingLink>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {items.map((item) => {
                  const itemKey = getCartItemKey(item);

                  return (
                    <div key={itemKey} className="rounded-xl border border-rose-line/80 bg-white/65 p-3">
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/70 bg-rose-soft">
                          <Image
                            src={item.image || FALLBACK_IMAGE}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-medium text-rose-ink">{item.name}</p>
                          <p className="text-xs text-rose-muted">Rs. {item.price.toFixed(2)} each</p>
                          {item.variantInfo ? (
                            <p className="mt-1 text-xs text-rose-muted">Variant: {item.variantInfo}</p>
                          ) : null}

                          <div className="mt-2 flex items-center gap-2">
                            <label htmlFor={`drawer-qty-${itemKey}`} className="text-xs text-rose-muted">
                              Qty
                            </label>
                            <input
                              id={`drawer-qty-${itemKey}`}
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(event) => handleQtyChange(itemKey, Number(event.target.value))}
                              className="w-16 rounded-lg border border-rose-line/80 bg-white px-2 py-1.5 text-sm outline-none"
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
          </div>

          <div className="border-t border-rose-line/80 p-4 sm:p-5">
            <div className="rounded-xl border border-rose-line/80 bg-white/65 p-3 text-sm text-rose-muted">
              <p>Items: {itemCount}</p>
              <p className="font-medium text-rose-ink">Subtotal: Rs. {subtotal.toFixed(2)}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <LoadingLink
                href={items.length === 0 ? "/cart" : "/checkout"}
                className={`btn-primary ${items.length === 0 ? "pointer-events-none opacity-60" : ""}`}
                aria-disabled={items.length === 0}
                onClick={() => setOpen(false)}
              >
                Proceed to checkout
              </LoadingLink>
              <button type="button" className="btn-ghost" onClick={handleClear} disabled={items.length === 0}>
                Clear cart
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
