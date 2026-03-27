const { Router } = require("express");
const { getDb, toObjectId } = require("../lib/db");
const { adminGuard } = require("../middleware/adminGuard");

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

const router = Router();

// GET /api/orders (admin)
router.get("/", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    const page = parseInt(req.query.page ?? "1", 10);
    const limit = parseInt(req.query.limit ?? "20", 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && VALID_STATUSES.includes(status)) filter.status = status;

    const col = db.collection("Order");
    const [total, orders] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    // Fetch order items for each order
    const orderIds = orders.map((o) => o._id);
    const items = orderIds.length
      ? await db.collection("OrderItem").find({ orderId: { $in: orderIds } }).toArray()
      : [];

    // Fetch product snapshots for items (name, images)
    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
    const products = productIds.length
      ? await db.collection("Product").find({ _id: { $in: productIds } }, { projection: { name: 1, images: 1 } }).toArray()
      : [];
    const prodMap = new Map(products.map((p) => [p._id.toString(), { name: p.name, images: p.images }]));

    const itemMap = new Map();
    for (const item of items) {
      const oid = item.orderId.toString();
      if (!itemMap.has(oid)) itemMap.set(oid, []);
      itemMap.get(oid).push({
        ...item,
        id: item._id.toString(),
        product: prodMap.get(item.productId?.toString()) ?? null,
      });
    }

    const data = orders.map((o) => ({
      ...o,
      id: o._id.toString(),
      items: itemMap.get(o._id.toString()) ?? [],
    }));

    res.json({
      ok: true,
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id (admin)
router.get("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const order = await db.collection("Order").findOne({ _id: oid });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const items = await db.collection("OrderItem").find({ orderId: oid }).toArray();
    const productIds = items.map((i) => i.productId).filter(Boolean);
    const products = productIds.length
      ? await db.collection("Product").find({ _id: { $in: productIds } }).toArray()
      : [];
    const prodMap = new Map(products.map((p) => [p._id.toString(), { ...p, id: p._id.toString() }]));

    res.json({
      ok: true,
      data: {
        ...order,
        id: order._id.toString(),
        items: items.map((i) => ({
          ...i,
          id: i._id.toString(),
          product: prodMap.get(i.productId?.toString()) ?? null,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/orders (public — place order from frontend)
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const {
      customerName, customerEmail, customerPhone,
      shippingAddress, city, state, pincode,
      items, couponCode, notes,
    } = req.body;

    if (!customerName || !customerEmail || !shippingAddress || !city || !pincode || !items?.length) {
      res.status(400).json({ error: "Missing required order fields" });
      return;
    }

    // Fetch products to get current prices
    const productIds = items.map((i) => toObjectId(i.productId)).filter(Boolean);
    const products = await db.collection("Product").find({ _id: { $in: productIds } }).toArray();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const linePrice = product.price * item.quantity;
      subtotal += linePrice;
      return {
        productId: product._id,
        productName: product.name,
        image: (product.images || [])[0] ?? null,
        quantity: item.quantity,
        price: product.price,
        variantInfo: item.variantInfo ?? null,
      };
    });

    // Apply coupon
    let discount = 0;
    if (couponCode) {
      const coupon = await db.collection("Coupon").findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.active) {
        const now = new Date();
        if (!coupon.expiresAt || coupon.expiresAt > now) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            if (!coupon.minOrder || subtotal >= coupon.minOrder) {
              discount = coupon.discountType === "PERCENT"
                ? Math.round((subtotal * coupon.value) / 100 * 100) / 100
                : Math.min(coupon.value, subtotal);
              await db.collection("Coupon").updateOne(
                { _id: coupon._id },
                { $inc: { usedCount: 1 } }
              );
            }
          }
        }
      }
    }

    const total = Math.max(0, subtotal - discount);
    const now = new Date();

    const orderDoc = {
      customerName, customerEmail, customerPhone: customerPhone || null,
      shippingAddress, city, state: state || null, pincode,
      subtotal, discount, total,
      couponCode: couponCode?.toUpperCase() ?? null,
      status: "PENDING",
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    };

    const orderResult = await db.collection("Order").insertOne(orderDoc);
    const orderId = orderResult.insertedId;

    // Insert order items
    const itemDocs = orderItems.map((item) => ({ ...item, orderId }));
    if (itemDocs.length) await db.collection("OrderItem").insertMany(itemDocs);

    res.status(201).json({
      ok: true,
      data: {
        ...orderDoc,
        id: orderId.toString(),
        _id: orderId,
        items: itemDocs.map((i) => ({ ...i, id: i._id?.toString() })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// PUT /api/orders/:id — update status (admin)
router.put("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status, notes } = req.body;
    const update = { updatedAt: new Date() };
    if (status && VALID_STATUSES.includes(status)) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const result = await db.collection("Order").findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ ok: true, data: { ...result, id: result._id.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// DELETE /api/orders/:id (admin)
router.delete("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    // Delete order items first (cascade)
    await db.collection("OrderItem").deleteMany({ orderId: oid });

    const result = await db.collection("Order").deleteOne({ _id: oid });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

module.exports = router;
