import { Router } from "express";
import { getDb, toObjectId } from "../lib/db.js";
import { adminGuard } from "../middleware/adminGuard.js";

const router = Router();

// GET /api/coupons (admin)
router.get("/", adminGuard, async (_req, res) => {
  try {
    const db = getDb();
    const coupons = await db.collection("Coupon").find().sort({ createdAt: -1 }).toArray();
    const data = coupons.map((c) => ({ ...c, id: c._id.toString() }));
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// GET /api/coupons/:id (admin)
router.get("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const coupon = await db.collection("Coupon").findOne({ _id: oid });
    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json({ ok: true, data: { ...coupon, id: coupon._id.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupon" });
  }
});

// POST /api/coupons (admin)
router.post("/", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const { code, description, discountType, value, minOrder, maxUses, expiresAt } = req.body;

    if (!code || !discountType || value === undefined) {
      res.status(400).json({ error: "code, discountType, and value are required" });
      return;
    }

    const now = new Date();
    const doc = {
      code: code.toUpperCase(),
      description: description || null,
      discountType,
      value,
      minOrder: minOrder ?? null,
      maxUses: maxUses ?? null,
      usedCount: 0,
      active: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("Coupon").insertOne(doc);
    res.status(201).json({ ok: true, data: { ...doc, id: result.insertedId.toString(), _id: result.insertedId } });
  } catch (err) {
    if (err.code === 11000) { res.status(409).json({ error: "Coupon code already exists" }); return; }
    console.error(err);
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

// PUT /api/coupons/:id (admin)
router.put("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const { description, discountType, value, minOrder, maxUses, expiresAt, active } = req.body;
    const update = { updatedAt: new Date() };
    if (description !== undefined) update.description = description;
    if (discountType) update.discountType = discountType;
    if (value !== undefined) update.value = value;
    if (minOrder !== undefined) update.minOrder = minOrder;
    if (maxUses !== undefined) update.maxUses = maxUses;
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (active !== undefined) update.active = active;

    const result = await db.collection("Coupon").findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json({ ok: true, data: { ...result, id: result._id.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

// DELETE /api/coupons/:id (admin)
router.delete("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const result = await db.collection("Coupon").deleteOne({ _id: oid });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

// POST /api/coupons/validate (public — used during checkout)
router.post("/validate", async (req, res) => {
  try {
    const db = getDb();
    const { code, subtotal } = req.body;
    if (!code) { res.status(400).json({ error: "Coupon code required" }); return; }

    const coupon = await db.collection("Coupon").findOne({ code: code.toUpperCase() });

    if (!coupon || !coupon.active) {
      res.status(404).json({ valid: false, error: "Coupon not found or inactive" });
      return;
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

export const couponRoutes = router;
