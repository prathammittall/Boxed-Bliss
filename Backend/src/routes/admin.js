const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { signAdminToken, verifyAdminToken, COOKIE_NAME } = require("../lib/auth");
const { adminGuard } = require("../middleware/adminGuard");

const router = Router();

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

    // Also set cookie for same-origin fallback
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    secure: true,
    sameSite: "none",
  });
  res.json({ ok: true });
});

// GET /api/admin/me
router.get("/me", adminGuard, (req, res) => {
  res.json({ ok: true, email: req.admin.email, role: req.admin.role });
});

module.exports = router;
