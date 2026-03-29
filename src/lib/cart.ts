export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
  variantInfo?: string | null;
};

const CART_KEY = "bb_cart_items";
const CART_UPDATED_EVENT = "bb-cart-updated";

function canUseStorage() {
  return typeof window !== "undefined";
}

function emitCartUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

function parseCartItems(value: string | null): CartItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          productId: String(record.productId ?? ""),
          slug: String(record.slug ?? ""),
          name: String(record.name ?? ""),
          price: Number(record.price ?? 0),
          image: typeof record.image === "string" ? record.image : null,
          quantity: normalizeQuantity(Number(record.quantity ?? 1)),
          variantInfo: typeof record.variantInfo === "string" ? record.variantInfo : null,
        } satisfies CartItem;
      })
      .filter((item) => Boolean(item.productId && item.slug && item.name));
  } catch {
    return [];
  }
}

function saveCartItems(items: CartItem[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartUpdated();
}

export function getCartItemKey(item: Pick<CartItem, "productId" | "variantInfo">) {
  return `${item.productId}::${item.variantInfo ?? ""}`;
}

export function getCartItems(): CartItem[] {
  if (!canUseStorage()) return [];
  return parseCartItems(localStorage.getItem(CART_KEY));
}

export function addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  const quantity = normalizeQuantity(item.quantity ?? 1);
  const items = getCartItems();
  const itemKey = getCartItemKey(item);
  const existingIndex = items.findIndex((entry) => getCartItemKey(entry) === itemKey);

  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      quantity: normalizeQuantity(items[existingIndex].quantity + quantity),
    };
  } else {
    items.push({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      price: item.price,
      image: item.image ?? null,
      quantity,
      variantInfo: item.variantInfo ?? null,
    });
  }

  saveCartItems(items);
}

export function updateCartItemQuantity(itemKey: string, quantity: number) {
  const items = getCartItems().map((item) =>
    getCartItemKey(item) === itemKey ? { ...item, quantity: normalizeQuantity(quantity) } : item
  );
  saveCartItems(items);
}

export function removeCartItem(itemKey: string) {
  const items = getCartItems().filter((item) => getCartItemKey(item) !== itemKey);
  saveCartItems(items);
}

export function clearCartItems() {
  if (!canUseStorage()) return;
  localStorage.removeItem(CART_KEY);
  emitCartUpdated();
}

export { CART_UPDATED_EVENT };
