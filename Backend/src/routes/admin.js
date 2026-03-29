import { Router } from "express";
import bcrypt from "bcryptjs";
import { signAdminToken, COOKIE_NAME } from "../lib/auth.js";
import { adminGuard } from "../middleware/adminGuard.js";

const router = Router();
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      res.status(500).json({ error: "Admin credentials not configured" });
      return;
    }

    if (email !== adminEmail) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Support both plain and hashed passwords
    let isValid = false;
    if (adminPassword.startsWith("$2")) {
      isValid = await bcrypt.compare(password, adminPassword);
    } else {
      isValid = password === adminPassword;
    }

    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = await signAdminToken({ email, role: "admin" });
    const isProd = process.env.NODE_ENV === "production";

    // Set auth cookie for session-based auth.
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: TOKEN_TTL_MS,
      path: "/",
    });

    // Return token in body so the frontend can store it for cross-origin use
    res.json({ ok: true, email, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/logout
router.post("/logout", (_req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie(COOKIE_NAME, {
    path: "/",
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ ok: true });
});

// GET /api/admin/me
router.get("/me", adminGuard, (req, res) => {
  res.json({ ok: true, email: req.admin.email, role: req.admin.role });
});

export const adminRoutes = router;
