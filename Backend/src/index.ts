import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Route handlers
import adminRoutes from "./routes/admin";
import uploadRoutes from "./routes/upload";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import couponRoutes from "./routes/coupons";
import contactRoutes from "./routes/contacts";
import analyticsRoutes from "./routes/analytics";

const app = express();
const PORT = process.env.PORT ?? 4000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true, // allow cookies to be sent cross-origin
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Boxed Bliss API", timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────

app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/analytics", analyticsRoutes);

// ── 404 fallback ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start server ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🌸 Boxed Bliss API running on http://localhost:${PORT}\n`);
  console.log("Available endpoints:");
  console.log("  GET    /api/health");
  console.log("  POST   /api/admin/login");
  console.log("  POST   /api/admin/logout");
  console.log("  GET    /api/admin/me");
  console.log("  POST   /api/upload");
  console.log("  POST   /api/upload/multiple");
  console.log("  GET    /api/categories");
  console.log("  GET    /api/categories/flat");
  console.log("  POST   /api/categories          [admin]");
  console.log("  PUT    /api/categories/:id       [admin]");
  console.log("  DELETE /api/categories/:id       [admin]");
  console.log("  GET    /api/products");
  console.log("  GET    /api/products/:id");
  console.log("  POST   /api/products             [admin]");
  console.log("  PUT    /api/products/:id         [admin]");
  console.log("  DELETE /api/products/:id         [admin]");
  console.log("  GET    /api/orders               [admin]");
  console.log("  GET    /api/orders/:id           [admin]");
  console.log("  POST   /api/orders               (public)");
  console.log("  PUT    /api/orders/:id           [admin]");
  console.log("  GET    /api/coupons              [admin]");
  console.log("  POST   /api/coupons              [admin]");
  console.log("  PUT    /api/coupons/:id          [admin]");
  console.log("  DELETE /api/coupons/:id          [admin]");
  console.log("  POST   /api/coupons/validate     (public)");
  console.log("  GET    /api/contacts             [admin]");
  console.log("  GET    /api/contacts/:id         [admin]");
  console.log("  POST   /api/contacts             (public)");
  console.log("  PUT    /api/contacts/:id         [admin]");
  console.log("  GET    /api/analytics            [admin]");
});

export default app;
