import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { adminGuard } from "../middleware/adminGuard";
import { getQueryString, getParamString } from "../lib/queryHelper";
import { OrderStatus } from "../../generated/prisma";

const router = Router();

// GET /api/orders  (admin)
router.get("/", adminGuard, async (req: Request, res: Response) => {
  try {
    const status = getQueryString(req.query.status);
    const page = parseInt(getQueryString(req.query.page) ?? "1", 10);
    const limit = parseInt(getQueryString(req.query.limit) ?? "20", 10);

    const skip = (page - 1) * limit;
    const take = limit;

    type OrderWhereTyped = { status?: OrderStatus };
    const where: OrderWhereTyped = {};
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { items: { include: { product: { select: { name: true, images: true } } } } },
        orderBy: { createdAt: "desc" },
        skip, take,
      }),
    ]);

    res.json({
      ok: true, data: orders,
      meta: { total, page, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id  (admin)
router.get("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getParamString(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ ok: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/orders  (public — place order from frontend)
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      customerName, customerEmail, customerPhone,
      shippingAddress, city, state, pincode,
      items, couponCode, notes,
    } = req.body as {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: string;
      city: string;
      state?: string;
      pincode: string;
      couponCode?: string;
      notes?: string;
      items: {
        productId: string;
        quantity: number;
        variantInfo?: string;
      }[];
    };

    if (!customerName || !customerEmail || !shippingAddress || !city || !pincode || !items?.length) {
      res.status(400).json({ error: "Missing required order fields" });
      return;
    }

    // Fetch products to get current prices
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map<string, typeof products[number]>(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const linePrice = product.price * item.quantity;
      subtotal += linePrice;
      return {
        productId: item.productId,
        productName: product.name,
        image: (product.images as string[])[0] ?? null,
        quantity: item.quantity,
        price: product.price,
        variantInfo: item.variantInfo ?? null,
      };
    });

    // Apply coupon
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.active) {
        const now = new Date();
        if (!coupon.expiresAt || coupon.expiresAt > now) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            if (!coupon.minOrder || subtotal >= coupon.minOrder) {
              discount = coupon.discountType === "PERCENT"
                ? Math.round((subtotal * coupon.value) / 100 * 100) / 100
                : Math.min(coupon.value, subtotal);
              // Increment usage
              await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
            }
          }
        }
      }
    }

    const total = Math.max(0, subtotal - discount);

    const order = await prisma.order.create({
      data: {
        customerName, customerEmail, customerPhone,
        shippingAddress, city, state, pincode,
        subtotal, discount, total,
        couponCode: couponCode?.toUpperCase() ?? null,
        notes,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    res.status(201).json({ ok: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// PUT /api/orders/:id  — update status (admin)
router.put("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getParamString(req.params.id);
    const { status, notes } = req.body as { status?: string; notes?: string };
    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status && Object.values(OrderStatus).includes(status as OrderStatus) && { status: status as OrderStatus }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json({ ok: true, data: order });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Order not found" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// DELETE /api/orders/:id  (admin)
router.delete("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getParamString(req.params.id);
    await prisma.order.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Order not found" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
