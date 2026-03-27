import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { signAdminToken, verifyAdminToken, COOKIE_NAME } from "../lib/auth";
import { adminGuard } from "../middleware/adminGuard";

const router = Router();

// POST /api/admin/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

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
      // Already bcrypt hash
      isValid = await bcrypt.compare(password, adminPassword);
    } else {
      // Plain text comparison (dev only — hash it on production)
      isValid = password === adminPassword;
    }

    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = await signAdminToken({ email, role: "admin" });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    res.json({ ok: true, email });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// GET /api/admin/me — verify session
router.get("/me", adminGuard, (req: Request, res: Response) => {
  const admin = (req as Request & { admin: { email: string; role: string } })
    .admin;
  res.json({ ok: true, email: admin.email, role: admin.role });
});

export default router;
