import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { getDb, toObjectId } from "../lib/db.js";
import { adminGuard } from "../middleware/adminGuard.js";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const RAZORPAY_CURRENCY = "INR";

const router = Router();

function getRazorpayCredentials() {
  const keyId = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }
  return { keyId, keySecret };
}

function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayCredentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function normalizeCheckoutPayload(payload) {
  const customerName = typeof payload.customerName === "string" ? payload.customerName.trim() : "";
  const customerEmail = typeof payload.customerEmail === "string" ? payload.customerEmail.trim() : "";
  const customerPhone = typeof payload.customerPhone === "string" ? payload.customerPhone.trim() : "";
  const shippingAddress = typeof payload.shippingAddress === "string" ? payload.shippingAddress.trim() : "";
  const city = typeof payload.city === "string" ? payload.city.trim() : "";
  const state = typeof payload.state === "string" ? payload.state.trim() : "";
  const pincode = typeof payload.pincode === "string" ? payload.pincode.trim() : "";
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  const couponCode = typeof payload.couponCode === "string" ? payload.couponCode.trim().toUpperCase() : "";
  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    city,
    state,
    pincode,
    notes,
    couponCode,
    items,
  };
}

async function computeOrderPricing(db, rawItems, couponCode) {
  if (!rawItems.length) {
    throw new Error("Order items are required");
  }

  const normalizedItems = rawItems.map((item) => ({
    productId: typeof item.productId === "string" ? item.productId.trim() : "",
    quantity: Number(item.quantity),
    variantInfo: typeof item.variantInfo === "string" ? item.variantInfo : null,
  }));

  if (normalizedItems.some((item) => !item.productId || !Number.isFinite(item.quantity) || item.quantity < 1)) {
    throw new Error("Invalid order items");
  }

  const productObjectIds = normalizedItems.map((item) => toObjectId(item.productId)).filter(Boolean);
  if (!productObjectIds.length) {
    throw new Error("Invalid order items");
  }

  const products = await db.collection("Product").find({ _id: { $in: productObjectIds } }).toArray();
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  let subtotal = 0;
  const orderItems = normalizedItems.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    const linePrice = Number(product.price) * item.quantity;
    subtotal += linePrice;

    return {
      productId: product._id,
      productName: product.name,
      image: (product.images || [])[0] ?? null,
      quantity: item.quantity,
      price: Number(product.price),
      variantInfo: item.variantInfo ?? null,
    };
  });

  let discount = 0;
  let appliedCouponId = null;
  let normalizedCouponCode = null;

  if (couponCode) {
    const coupon = await db.collection("Coupon").findOne({ code: couponCode });
    if (coupon && coupon.active) {
      const now = new Date();
      const notExpired = !coupon.expiresAt || coupon.expiresAt > now;
      const underUsageLimit = !coupon.maxUses || coupon.usedCount < coupon.maxUses;
      const meetsMinOrder = !coupon.minOrder || subtotal >= coupon.minOrder;

      if (notExpired && underUsageLimit && meetsMinOrder) {
        discount = coupon.discountType === "PERCENT"
          ? Math.round((subtotal * coupon.value) / 100 * 100) / 100
          : Math.min(coupon.value, subtotal);
        appliedCouponId = coupon._id;
        normalizedCouponCode = coupon.code;
      }
    }
  }

  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  return {
    subtotal,
    discount,
    total,
    amountPaise: Math.round(total * 100),
    orderItems,
    couponId: appliedCouponId,
    couponCode: normalizedCouponCode,
  };
}

async function createOrderAndItems({ db, checkout, pricing, paymentMethod, status, paymentGatewayOrderId, paymentTransactionId }) {
  const now = new Date();
  const orderDoc = {
    customerName: checkout.customerName,
    customerEmail: checkout.customerEmail,
    customerPhone: checkout.customerPhone || null,
    shippingAddress: checkout.shippingAddress,
    city: checkout.city,
    state: checkout.state || null,
    pincode: checkout.pincode,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    total: pricing.total,
    paymentMethod,
    paymentProofUrl: null,
    paymentProofPublicId: null,
    paymentGatewayOrderId: paymentGatewayOrderId ?? null,
    paymentTransactionId: paymentTransactionId ?? null,
    couponCode: pricing.couponCode,
    status,
    notes: checkout.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  const orderResult = await db.collection("Order").insertOne(orderDoc);
  const orderId = orderResult.insertedId;

  const itemDocs = pricing.orderItems.map((item) => ({ ...item, orderId }));
  if (itemDocs.length) {
    await db.collection("OrderItem").insertMany(itemDocs);
  }

  if (pricing.couponId) {
    await db.collection("Coupon").updateOne(
      { _id: pricing.couponId },
      { $inc: { usedCount: 1 } }
    );
  }

  void notifyFormspreeAboutOrder({
    orderId: orderId.toString(),
    orderDoc,
    itemDocs,
  });

  return {
    ...orderDoc,
    id: orderId.toString(),
    _id: orderId,
    items: itemDocs.map((item) => ({
      ...item,
      id: item._id?.toString?.(),
      orderId: orderId.toString(),
      productId: item.productId?.toString?.() ?? String(item.productId),
    })),
  };
}

function formatItemsForEmail(items) {
  return items
    .map((item, index) => {
      const lineTotal = Number(item.price) * Number(item.quantity);
      return [
        `${index + 1}. ${item.productName}`,
        `   Product ID: ${item.productId}`,
        `   Quantity: ${item.quantity}`,
        `   Unit Price: ${item.price}`,
        `   Line Total: ${lineTotal.toFixed(2)}`,
        `   Variant: ${item.variantInfo ?? "N/A"}`,
      ].join("\n");
    })
    .join("\n\n");
}

async function notifyFormspreeAboutOrder({ orderId, orderDoc, itemDocs }) {
  const endpoint = (process.env.FORMSPREE_ORDER_ENDPOINT ?? "").trim();
  if (!endpoint) return;

  const message = [
    `Order ID: ${orderId}`,
    `Customer Name: ${orderDoc.customerName}`,
    `Customer Email: ${orderDoc.customerEmail}`,
    `Customer Phone: ${orderDoc.customerPhone ?? "N/A"}`,
    `Address: ${orderDoc.shippingAddress}, ${orderDoc.city}${orderDoc.state ? `, ${orderDoc.state}` : ""} - ${orderDoc.pincode}`,
    `Subtotal: ${orderDoc.subtotal}`,
    `Discount: ${orderDoc.discount}`,
    `Total: ${orderDoc.total}`,
    `Payment Method: ${orderDoc.paymentMethod ?? "N/A"}`,
    `Payment Proof URL: ${orderDoc.paymentProofUrl ?? "N/A"}`,
    `Gateway Order ID: ${orderDoc.paymentGatewayOrderId ?? "N/A"}`,
    `Gateway Payment ID: ${orderDoc.paymentTransactionId ?? "N/A"}`,
    `Coupon: ${orderDoc.couponCode ?? "N/A"}`,
    `Status: ${orderDoc.status}`,
    `Notes: ${orderDoc.notes ?? "N/A"}`,
    "",
    "Items:",
    formatItemsForEmail(itemDocs),
  ].join("\n");

  const payload = {
    _subject: `New Boxed Bliss Order #${orderId}`,
    orderId,
    customerName: orderDoc.customerName,
    customerEmail: orderDoc.customerEmail,
    customerPhone: orderDoc.customerPhone ?? "",
    shippingAddress: orderDoc.shippingAddress,
    city: orderDoc.city,
    state: orderDoc.state ?? "",
    pincode: orderDoc.pincode,
    subtotal: orderDoc.subtotal,
    discount: orderDoc.discount,
    total: orderDoc.total,
    paymentMethod: orderDoc.paymentMethod ?? "",
    paymentProofUrl: orderDoc.paymentProofUrl ?? "",
    paymentProofPublicId: orderDoc.paymentProofPublicId ?? "",
    paymentGatewayOrderId: orderDoc.paymentGatewayOrderId ?? "",
    paymentTransactionId: orderDoc.paymentTransactionId ?? "",
    couponCode: orderDoc.couponCode ?? "",
    orderStatus: orderDoc.status,
    notes: orderDoc.notes ?? "",
    items: itemDocs.map((item) => ({
      productId: item.productId?.toString?.() ?? String(item.productId),
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      lineTotal: Number(item.price) * Number(item.quantity),
      variantInfo: item.variantInfo ?? null,
      image: item.image ?? null,
    })),
    message,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Formspree order notification failed:", response.status, body);
    }
  } catch (error) {
    console.error("Formspree order notification error:", error);
  }
}

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

// GET /api/orders/track (public)
router.get("/track", async (req, res) => {
  try {
    const db = getDb();
    const orderId = typeof req.query.orderId === "string" ? req.query.orderId.trim() : "";
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";

    if (!orderId || !email) {
      res.status(400).json({ error: "orderId and email are required" });
      return;
    }

    const oid = toObjectId(orderId);
    if (!oid) {
      res.status(400).json({ error: "Invalid orderId" });
      return;
    }

    const order = await db.collection("Order").findOne({ _id: oid });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const orderEmail = String(order.customerEmail ?? "").trim().toLowerCase();
    if (orderEmail !== email) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const items = await db.collection("OrderItem").find({ orderId: oid }).toArray();

    res.json({
      ok: true,
      data: {
        ...order,
        id: order._id.toString(),
        items: items.map((item) => ({
          ...item,
          id: item._id.toString(),
          orderId: item.orderId.toString(),
          productId: item.productId?.toString?.() ?? String(item.productId),
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to track order" });
  }
});

// POST /api/orders/razorpay/create-order (public)
router.post("/razorpay/create-order", async (req, res) => {
  try {
    const db = getDb();
    const checkout = normalizeCheckoutPayload(req.body ?? {});

    if (!checkout.customerName || !checkout.customerEmail || !checkout.shippingAddress || !checkout.city || !checkout.pincode) {
      res.status(400).json({ error: "Missing required delivery fields" });
      return;
    }

    const pricing = await computeOrderPricing(db, checkout.items, checkout.couponCode);
    if (pricing.amountPaise <= 0) {
      res.status(400).json({ error: "Order total must be greater than zero" });
      return;
    }

    const razorpay = getRazorpayClient();
    const receipt = `bb_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;

    const gatewayOrder = await razorpay.orders.create({
      amount: pricing.amountPaise,
      currency: RAZORPAY_CURRENCY,
      receipt,
      notes: {
        customerEmail: checkout.customerEmail,
        customerName: checkout.customerName,
      },
    });

    await db.collection("PaymentAttempt").updateOne(
      { gatewayOrderId: gatewayOrder.id },
      {
        $set: {
          gateway: "RAZORPAY",
          gatewayOrderId: gatewayOrder.id,
          amount: pricing.amountPaise,
          currency: RAZORPAY_CURRENCY,
          status: "CREATED",
          checkout,
          pricing,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const { keyId } = getRazorpayCredentials();
    res.json({
      ok: true,
      data: {
        keyId,
        orderId: gatewayOrder.id,
        amount: pricing.amountPaise,
        currency: RAZORPAY_CURRENCY,
        name: "Boxed Bliss",
        description: "Complete your order payment",
        prefill: {
          name: checkout.customerName,
          email: checkout.customerEmail,
          contact: checkout.customerPhone || undefined,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

// POST /api/orders/razorpay/verify (public)
router.post("/razorpay/verify", async (req, res) => {
  try {
    const db = getDb();
    const razorpayOrderId = typeof req.body?.razorpay_order_id === "string" ? req.body.razorpay_order_id.trim() : "";
    const razorpayPaymentId = typeof req.body?.razorpay_payment_id === "string" ? req.body.razorpay_payment_id.trim() : "";
    const razorpaySignature = typeof req.body?.razorpay_signature === "string" ? req.body.razorpay_signature.trim() : "";

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ error: "Missing Razorpay verification fields" });
      return;
    }

    const paymentAttempt = await db.collection("PaymentAttempt").findOne({ gatewayOrderId: razorpayOrderId });
    if (!paymentAttempt) {
      res.status(404).json({ error: "Payment attempt not found" });
      return;
    }

    if (paymentAttempt.status === "VERIFIED" && paymentAttempt.internalOrderId) {
      const existingOrder = await db.collection("Order").findOne({ _id: paymentAttempt.internalOrderId });
      if (existingOrder) {
        const existingItems = await db.collection("OrderItem").find({ orderId: paymentAttempt.internalOrderId }).toArray();
        res.json({
          ok: true,
          data: {
            ...existingOrder,
            id: existingOrder._id.toString(),
            items: existingItems.map((item) => ({
              ...item,
              id: item._id.toString(),
              orderId: item.orderId.toString(),
              productId: item.productId?.toString?.() ?? String(item.productId),
            })),
          },
        });
        return;
      }
    }

    const { keySecret } = getRazorpayCredentials();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      await db.collection("PaymentAttempt").updateOne(
        { _id: paymentAttempt._id },
        {
          $set: {
            status: "FAILED",
            verificationFailedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    const lockedAttempt = await db.collection("PaymentAttempt").findOneAndUpdate(
      { _id: paymentAttempt._id, status: "CREATED" },
      {
        $set: {
          status: "VERIFYING",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!lockedAttempt) {
      const latestAttempt = await db.collection("PaymentAttempt").findOne({ _id: paymentAttempt._id });
      if (latestAttempt?.status === "VERIFIED" && latestAttempt.internalOrderId) {
        const existingOrder = await db.collection("Order").findOne({ _id: latestAttempt.internalOrderId });
        if (existingOrder) {
          const existingItems = await db.collection("OrderItem").find({ orderId: latestAttempt.internalOrderId }).toArray();
          res.json({
            ok: true,
            data: {
              ...existingOrder,
              id: existingOrder._id.toString(),
              items: existingItems.map((item) => ({
                ...item,
                id: item._id.toString(),
                orderId: item.orderId.toString(),
                productId: item.productId?.toString?.() ?? String(item.productId),
              })),
            },
          });
          return;
        }
      }
      res.status(409).json({ error: "Payment verification is already in progress" });
      return;
    }

    const createdOrder = await createOrderAndItems({
      db,
      checkout: lockedAttempt.checkout,
      pricing: lockedAttempt.pricing,
      paymentMethod: "RAZORPAY",
      status: "CONFIRMED",
      paymentGatewayOrderId: razorpayOrderId,
      paymentTransactionId: razorpayPaymentId,
    });

    await db.collection("PaymentAttempt").updateOne(
      { _id: paymentAttempt._id },
      {
        $set: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          updatedAt: new Date(),
          razorpayPaymentId,
          razorpaySignature,
          internalOrderId: createdOrder._id,
        },
      }
    );

    res.json({ ok: true, data: createdOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify Razorpay payment" });
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
    const checkout = normalizeCheckoutPayload(req.body ?? {});

    if (!checkout.customerName || !checkout.customerEmail || !checkout.shippingAddress || !checkout.city || !checkout.pincode) {
      res.status(400).json({ error: "Missing required order fields" });
      return;
    }

    const pricing = await computeOrderPricing(db, checkout.items, checkout.couponCode);
    const paymentMethod = typeof req.body?.paymentMethod === "string" && req.body.paymentMethod.trim()
      ? req.body.paymentMethod.trim().toUpperCase()
      : "MANUAL";

    const createdOrder = await createOrderAndItems({
      db,
      checkout,
      pricing,
      paymentMethod,
      status: "PENDING",
      paymentGatewayOrderId: null,
      paymentTransactionId: null,
    });

    res.status(201).json({ ok: true, data: createdOrder });
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

export const orderRoutes = router;
