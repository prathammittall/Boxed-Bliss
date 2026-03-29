import { proxy } from "@/app/proxy";

// ── Token storage (cross-origin auth) ────────────────────────────────────────
const TOKEN_KEY = "bb_admin_token";

function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type ClientContext = {
  sourcePage: string;
  referrer: string;
  userAgent: string;
  submittedAt: string;
};

function getClientContext(): ClientContext {
  if (typeof window === "undefined") {
    return {
      sourcePage: "",
      referrer: "",
      userAgent: "",
      submittedAt: new Date().toISOString(),
    };
  }

  return {
    sourcePage: window.location.href,
    referrer: document.referrer || "",
    userAgent: window.navigator.userAgent || "",
    submittedAt: new Date().toISOString(),
  };
}

type PrimitiveQueryValue = string | number | boolean;

type QueryParams = Record<string, PrimitiveQueryValue | null | undefined>;

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  children?: Category[];
};

export type ProductVariant = {
  id: string;
  label: string;
  value: string;
  price?: number | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  images: string[];
  inStock: boolean;
  featured: boolean;
  categoryId?: string | null;
  category?: Category | null;
  variants?: ProductVariant[];
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  description?: string | null;
  discountType: "PERCENT" | "FIXED";
  value: number;
  minOrder?: number | null;
  maxUses?: number | null;
  usedCount: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  image?: string | null;
  quantity: number;
  price: number;
  variantInfo?: string | null;
};

export type Order = {
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
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
  paymentProofPublicId?: string | null;
  couponCode?: string | null;
  notes?: string | null;
  status: string;
  items: OrderItem[];
  createdAt: string;
};

export type Analytics = {
  products: { total: number; featured: number };
  categories: { total: number };
  orders: {
    total: number;
    byStatus: {
      pending: number;
      confirmed: number;
      shipped: number;
      delivered: number;
      cancelled: number;
    };
  };
  revenue: { total: number };
  contacts: { unread: number };
  coupons: { total: number; active: number };
  recentOrders: Array<{
    id: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    images: string[];
  }>;
};

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null) {
    const maybePayload = payload as Record<string, unknown>;
    if (typeof maybePayload.error === "string") {
      return maybePayload.error;
    }
  }
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }
  return fallback;
}

function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function request<T>(
  path: string,
  init?: RequestInit & { query?: QueryParams }
): Promise<T> {
  const url = `${proxy}${path}${buildQueryString(init?.query)}`;
  const headers = new Headers(init?.headers);
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!isFormData && init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach stored token as Authorization header for cross-origin requests
  const storedToken = getToken();
  if (storedToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${storedToken}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: init?.cache ?? "no-store",
  });

  const payload = await parseResponseBody(response);

  if (response.status === 401 && storedToken) {
    clearToken();
  }

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    throw new ApiError(getErrorMessage(payload, fallback), response.status, payload);
  }

  return payload as T;
}

function extractEnvelopeData<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}

export const api = {
  // Health
  health: () => request<{ ok: true; service: string; timestamp: string }>("/api/health"),

  // Admin
  adminLogin: async (email: string, password: string) => {
    const res = await request<{ ok: true; email: string; token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Store token in localStorage so all subsequent requests use Bearer auth
    if (res.token) saveToken(res.token);
    return res;
  },
  adminLogout: async () => {
    const res = await request<{ ok: true }>("/api/admin/logout", { method: "POST" });
    clearToken();
    return res;
  },
  adminMe: () => request<{ ok: true; email: string; role: string }>("/api/admin/me"),

  // Upload
  uploadSingle: (formData: FormData) =>
    request<{ ok: true; url: string; publicId: string }>("/api/upload", {
      method: "POST",
      body: formData,
    }),
  uploadMultiple: (formData: FormData) =>
    request<{ ok: true; images: Array<{ url: string; publicId: string }> }>("/api/upload/multiple", {
      method: "POST",
      body: formData,
    }),
  uploadPaymentProof: (formData: FormData) =>
    request<{ ok: true; url: string; publicId: string }>("/api/upload/payment-proof", {
      method: "POST",
      body: formData,
    }),
  uploadImageFile: async (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append("image", file);
    if (folder) formData.append("folder", folder);

    const result = await request<{ ok: true; url: string; publicId: string }>("/api/upload", {
      method: "POST",
      body: formData,
    });
    return result.url;
  },

  // Categories
  getCategories: async () => extractEnvelopeData(await request<ApiEnvelope<Category[]>>("/api/categories")),
  getCategoriesFlat: async () => extractEnvelopeData(await request<ApiEnvelope<Category[]>>("/api/categories/flat")),
  createCategory: async (payload: Partial<Category> & { name: string; slug: string }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Category>>("/api/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),
  updateCategory: async (id: string, payload: Partial<Category>) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Category>>(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    ),
  deleteCategory: (id: string) =>
    request<{ ok: true }>(`/api/categories/${id}`, {
      method: "DELETE",
    }),

  // Products
  getProducts: (query?: {
    category?: string;
    featured?: boolean;
    inStock?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    request<ApiEnvelope<Product[]>>("/api/products", {
      query,
    }),
  getProduct: async (id: string) =>
    extractEnvelopeData(await request<ApiEnvelope<Product>>(`/api/products/${id}`)),
  createProduct: async (payload: Partial<Product> & { name: string; slug: string; price: number }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Product>>("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),
  updateProduct: async (id: string, payload: Partial<Product>) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Product>>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    ),
  deleteProduct: (id: string) =>
    request<{ ok: true }>(`/api/products/${id}`, {
      method: "DELETE",
    }),

  // Orders
  getOrders: (query?: { status?: string; page?: number; limit?: number }) =>
    request<ApiEnvelope<Order[]>>("/api/orders", {
      query,
    }),
  trackOrder: async (payload: { orderId: string; email: string }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Order>>("/api/orders/track", {
        query: {
          orderId: payload.orderId,
          email: payload.email,
        },
      })
    ),
  getOrder: async (id: string) => extractEnvelopeData(await request<ApiEnvelope<Order>>(`/api/orders/${id}`)),
  createOrder: async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: string;
    city: string;
    state?: string;
    pincode: string;
    couponCode?: string;
    notes?: string;
    paymentMethod?: string;
    paymentProofUrl?: string;
    paymentProofPublicId?: string;
    items: Array<{ productId: string; quantity: number; variantInfo?: string }>;
    clientContext?: ClientContext;
  }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Order>>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ ...payload, clientContext: payload.clientContext ?? getClientContext() }),
      })
    ),
  updateOrder: async (id: string, payload: { status?: string; notes?: string }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Order>>(`/api/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    ),

  // Coupons
  getCoupons: async () => extractEnvelopeData(await request<ApiEnvelope<Coupon[]>>("/api/coupons")),
  getCoupon: async (id: string) => extractEnvelopeData(await request<ApiEnvelope<Coupon>>(`/api/coupons/${id}`)),
  createCoupon: async (payload: {
    code: string;
    description?: string;
    discountType: "PERCENT" | "FIXED";
    value: number;
    minOrder?: number;
    maxUses?: number;
    expiresAt?: string;
  }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Coupon>>("/api/coupons", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),
  updateCoupon: async (
    id: string,
    payload: {
      description?: string;
      discountType?: "PERCENT" | "FIXED";
      value?: number;
      minOrder?: number | null;
      maxUses?: number | null;
      expiresAt?: string | null;
      active?: boolean;
    }
  ) =>
    extractEnvelopeData(
      await request<ApiEnvelope<Coupon>>(`/api/coupons/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    ),
  deleteCoupon: (id: string) =>
    request<{ ok: true }>(`/api/coupons/${id}`, {
      method: "DELETE",
    }),
  validateCoupon: (code: string, subtotal: number) =>
    request<{
      valid: boolean;
      discount?: number;
      discountType?: "PERCENT" | "FIXED";
      value?: number;
      description?: string | null;
      error?: string;
    }>("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    }),

  // Contacts
  getContacts: (query?: { read?: boolean; page?: number; limit?: number }) =>
    request<ApiEnvelope<ContactSubmission[]>>("/api/contacts", {
      query,
    }),
  getContact: async (id: string) =>
    extractEnvelopeData(await request<ApiEnvelope<ContactSubmission>>(`/api/contacts/${id}`)),
  createContact: async (payload: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    clientContext?: ClientContext;
  }) =>
    extractEnvelopeData(
      await request<ApiEnvelope<ContactSubmission>>("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ ...payload, clientContext: payload.clientContext ?? getClientContext() }),
      })
    ),
  updateContact: async (id: string, read: boolean) =>
    extractEnvelopeData(
      await request<ApiEnvelope<ContactSubmission>>(`/api/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ read }),
      })
    ),

  // Analytics
  getAnalytics: async () =>
    extractEnvelopeData(await request<ApiEnvelope<Analytics>>("/api/analytics")),
};