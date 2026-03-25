import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { adminGuard } from "../middleware/adminGuard";
import { getQueryString } from "../lib/queryHelper";

const router = Router();

// GET /api/coupons  (admin)
router.get("/", adminGuard, async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ ok: true, data: coupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// GET /api/coupons/:id  (admin)
router.get("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json({ ok: true, data: coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupon" });
  }
});

// POST /api/coupons  (admin)
router.post("/", adminGuard, async (req: Request, res: Response) => {
  try {
    const { code, description, discountType, value, minOrder, maxUses, expiresAt } = req.body as {
      code: string;
      description?: string;
      discountType: "PERCENT" | "FIXED";
      value: number;
      minOrder?: number;
      maxUses?: number;
      expiresAt?: string;
    };

    if (!code || !discountType || value === undefined) {
      res.status(400).json({ error: "code, discountType, and value are required" });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        value,
        minOrder: minOrder ?? null,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json({ ok: true, data: coupon });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Coupon code already exists" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

// PUT /api/coupons/:id  (admin)
router.put("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    const { description, discountType, value, minOrder, maxUses, expiresAt, active } = req.body as {
      description?: string;
      discountType?: "PERCENT" | "FIXED";
      value?: number;
      minOrder?: number | null;
      maxUses?: number | null;
      expiresAt?: string | null;
      active?: boolean;
    };

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(discountType && { discountType }),
        ...(value !== undefined && { value }),
        ...(minOrder !== undefined && { minOrder }),
        ...(maxUses !== undefined && { maxUses }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(active !== undefined && { active }),
      },
    });
    res.json({ ok: true, data: coupon });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Coupon not found" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

// DELETE /api/coupons/:id  (admin)
router.delete("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    await prisma.coupon.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Coupon not found" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

// POST /api/coupons/validate  (public — used during checkout)
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body as { code: string; subtotal: number };
    if (!code) { res.status(400).json({ error: "Coupon code required" }); return; }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.active) {
      res.status(404).json({ valid: false, error: "Coupon not found or inactive" }); return;
    }

    const now = new Date();
    if (coupon.expiresAt && coupon.expiresAt < now) {
      res.json({ valid: false, error: "Coupon has expired" }); return;
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      res.json({ valid: false, error: "Coupon usage limit reached" }); return;
    }
    if (coupon.minOrder && subtotal < coupon.minOrder) {
      res.json({ valid: false, error: `Minimum order of ₹${coupon.minOrder} required` }); return;
    }

    const discount = coupon.discountType === "PERCENT"
      ? Math.round((subtotal * coupon.value) / 100 * 100) / 100
      : Math.min(coupon.value, subtotal);

    res.json({ valid: true, discount, discountType: coupon.discountType, value: coupon.value, description: coupon.description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to validate coupon" });
  }
});

export default router;
