# Boxed Bliss — Backend & Admin Panel Implementation Plan

## Overview

The frontend is a Next.js 16 app with a rose-themed handcraft gift store. The Backend folder holds a Prisma schema targeting **MongoDB** (Atlas). We will build everything **inside the same Next.js project** using App Router API routes so the frontend and backend share one deployment. The Backend folder is kept only for the Prisma schema/migrations.

Key stack additions:
- **Prisma + MongoDB** — Already configured; we expand the schema
- **Cloudinary** — Image uploads from admin product forms
- **bcryptjs + jose** — Password hashing and JWT-based admin sessions
- **Next.js API Routes** — All backend endpoints under `src/app/api/`

---

## User Review Required

> [!IMPORTANT]
> The admin panel will be protected by a **hardcoded admin credential** stored in `.env.local` (`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`) for simplicity — no separate user DB table. A future upgrade can add a full user model.

> [!IMPORTANT]
> Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) must be added to `.env.local` (and Backend/.env is updated for reference). You will need to supply your own Cloudinary account credentials.

> [!WARNING]
> The existing [Backend/prisma/schema.prisma](file:///d:/Projects/Boxed_Bliss/Backend/prisma/schema.prisma) uses `prisma-client` generator which is the new Prisma 6+ Early Access generator. We will use the standard `prisma-client-js` generator to ensure compatibility.

---

## Proposed Changes

### Prisma Schema

#### [MODIFY] [schema.prisma](file:///d:/Projects/Boxed_Bliss/Backend/prisma/schema.prisma)

New models:
- **Category** — top-level & nested (self-relation `parentId`) with `name`, `slug`, `description`, `image`
- **Product** — `name`, `slug`, `description`, `price`, `comparePrice`, `images[]`, `inStock`, `featured`, `categoryId`, relations `Category`
- **ProductVariant** — size/color/type options with `price` override
- **Order** — customer info, `status`, `items[]`, `total`, timestamps
- **OrderItem** — product snapshot, quantity, price
- **Coupon** — `code`, `discountType` (PERCENT/FIXED), `value`, `minOrder`, `expiresAt`, `usageLimit`
- **ContactSubmission** — name, email, message, `read` flag

---

### Package Installation

Install in the root project directory:
- `cloudinary` — official Cloudinary Node SDK
- `bcryptjs` + `@types/bcryptjs` — password hashing
- `jose` — JWT creation/verification (Edge-compatible)
- `@prisma/client` is already present

---

### Backend lib utilities

#### [NEW] [prisma.ts](file:///d:/Projects/Boxed_Bliss/src/lib/prisma.ts)
Singleton Prisma client that reads `DATABASE_URL` from env.

#### [NEW] [cloudinary.ts](file:///d:/Projects/Boxed_Bliss/src/lib/cloudinary.ts)
Configured Cloudinary v2 instance for server-side uploads.

#### [NEW] [auth.ts](file:///d:/Projects/Boxed_Bliss/src/lib/auth.ts)
`signAdminToken()`, `verifyAdminToken()` using `jose` JWTs. Reads `ADMIN_JWT_SECRET` from env.

#### [NEW] [admin-guard.ts](file:///d:/Projects/Boxed_Bliss/src/lib/admin-guard.ts)
Helper to verify the admin cookie from `NextRequest` and return 401 if invalid.

---

### API Routes

#### [NEW] `src/app/api/admin/login/route.ts`
`POST` — Verifies email+password against env vars, returns JWT cookie.

#### [NEW] `src/app/api/admin/logout/route.ts`
`POST` — Clears the JWT cookie.

#### [NEW] `src/app/api/admin/me/route.ts`
`GET` — Returns `{ ok: true }` if the admin cookie is valid (used by client-side auth guard).

#### [NEW] `src/app/api/upload/route.ts`
`POST` — Accepts `multipart/form-data` with an `image` field, streams to Cloudinary, returns `{ url, publicId }`. Protected by admin guard.

#### [NEW] `src/app/api/categories/route.ts`
`GET` — Fetch all categories (with children). `POST` — Create category (admin protected).

#### [NEW] `src/app/api/categories/[id]/route.ts`
`GET` / `PUT` / `DELETE` — Single category operations.

#### [NEW] `src/app/api/products/route.ts`
`GET` — List products with optional `?category=` filter, `?featured=true`, pagination. `POST` — Create product (admin protected).

#### [NEW] `src/app/api/products/[id]/route.ts`
`GET` / `PUT` / `DELETE` — Single product operations.

#### [NEW] `src/app/api/orders/route.ts`
`GET` — List orders (admin, paginated). `POST` — Place new order (public, called from checkout).

#### [NEW] `src/app/api/orders/[id]/route.ts`
`GET` — Order detail. `PUT` — Update status (admin).

#### [NEW] `src/app/api/coupons/route.ts`
`GET` / `POST` — Coupon CRUD (admin).

#### [NEW] `src/app/api/coupons/[id]/route.ts`
`PUT` / `DELETE` — Update/delete coupon.

#### [NEW] `src/app/api/coupons/validate/route.ts`
`POST` — Validate a coupon code (public, used during checkout).

#### [NEW] `src/app/api/contacts/route.ts`
`GET` — List contact form submissions (admin). `POST` — Submit contact form (public).

#### [NEW] `src/app/api/contacts/[id]/route.ts`
`PUT` — Mark as read/unread (admin).

#### [NEW] `src/app/api/analytics/route.ts`
`GET` — Returns `{ totalProducts, totalOrders, totalRevenue, pendingOrders, unreadContacts }`.

---

### Admin Panel UI

All pages under `src/app/admin/` use a custom layout with no Navbar/Footer.

#### [NEW] [layout.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/layout.tsx)
Fixed sidebar with links for Dashboard, Products, Categories, Orders, Coupons, Contacts. Checks auth on mount and redirects to `/admin/login` if not authenticated.

#### [NEW] [page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/page.tsx)
Dashboard with stat cards (products, orders, revenue, unread contacts) fetched from `/api/analytics`.

#### [NEW] [login/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/login/page.tsx)
Email + password form; on success sets cookie and redirects to `/admin`.

#### [NEW] [products/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/products/page.tsx)
Table of all products. Delete button. Link to edit. "New Product" button.

#### [NEW] [products/new/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/products/new/page.tsx)
Form: name, slug (auto), description, price, comparePrice, category dropdown, images (Cloudinary uploader), inStock toggle, featured toggle. Variants section.

#### [NEW] [products/[id]/edit/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/products/[id]/edit/page.tsx)
Same form pre-populated with existing product data.

#### [NEW] [categories/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/categories/page.tsx)
Tree view of categories + sub-categories. Add/Edit/Delete inline. Parent selector for sub-categories.

#### [NEW] [orders/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/orders/page.tsx)
Orders table with customer name, total, status badge. Click to expand order details. Status dropdown to update.

#### [NEW] [coupons/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/coupons/page.tsx)
Coupon list with create/edit/delete modal.

#### [NEW] [contacts/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/admin/contacts/page.tsx)
Contact submission inbox. Mark as read. View full message.

---

### Frontend Integration

#### [MODIFY] [page.tsx (shop)](file:///d:/Projects/Boxed_Bliss/src/app/shop/page.tsx)
Fetch products from `/api/products` server-side.

#### [MODIFY] [page.tsx (collections)](file:///d:/Projects/Boxed_Bliss/src/app/collections/page.tsx)
Fetch categories from `/api/categories` server-side.

#### [NEW] [shop/[id]/page.tsx](file:///d:/Projects/Boxed_Bliss/src/app/shop/[id]/page.tsx)
Product detail page fetching `/api/products/[id]`.

#### [MODIFY] [ContactForm.tsx](file:///d:/Projects/Boxed_Bliss/src/components/ContactForm.tsx)
Wire the form to `POST /api/contacts`.

---

### Environment Variables

Add to **`d:/Projects/Boxed_Bliss/.env.local`** (new file, not committed):
```
DATABASE_URL="<your MongoDB URL>"   # copied from Backend/.env
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
ADMIN_EMAIL="admin@boxedbliss.com"
ADMIN_PASSWORD="<plaintext on first run>"
ADMIN_JWT_SECRET="<random 32-char string>"
```

---

## Verification Plan

### Automated Tests
No existing test suite found in the repo. We will perform manual verification via browser.

### Browser Verification (via browser subagent after implementation)
1. Start dev server: `npm run dev` in `d:/Projects/Boxed_Bliss`
2. Navigate to `http://localhost:3000/admin/login` — Verify login form appears
3. Login with credentials from `.env.local` — Verify redirect to dashboard
4. Dashboard shows 0 stats on fresh DB
5. Go to Categories → Create a category "Hampers" with an image upload
6. Go to Products → Create a product assigned to "Hampers", upload at least one image via Cloudinary uploader
7. Go to `/shop` — Verify the real product appears
8. Go to `/collections` — Verify real category appears
9. Go to Admin → Orders — Should be empty initially
10. Test coupon creation and validation endpoint via browser fetch

### Manual API verification (PowerShell)
```powershell
# Test login
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@boxedbliss.com","password":"yourpassword"}'

# Test analytics (requires cookie - easy to check after browser login)
Invoke-RestMethod -Uri "http://localhost:3000/api/analytics"

# Test products listing
Invoke-RestMethod -Uri "http://localhost:3000/api/products"

# Test categories listing  
Invoke-RestMethod -Uri "http://localhost:3000/api/categories"
```
