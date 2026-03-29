import { Router } from "express";
import { getDb } from "../lib/db.js";
import { adminGuard } from "../middleware/adminGuard.js";

const router = Router();

// GET /api/analytics (admin)
router.get("/", adminGuard, async (_req, res) => {
  try {
    const db = getDb();

    const [
      totalProducts,
      featuredProducts,
      totalCategories,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      unreadContacts,
      totalCoupons,
      activeCoupons,
      revenueAgg,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      db.collection("Product").countDocuments(),
      db.collection("Product").countDocuments({ featured: true }),
      db.collection("Category").countDocuments(),
      db.collection("Order").countDocuments(),
      db.collection("Order").countDocuments({ status: "PENDING" }),
      db.collection("Order").countDocuments({ status: "CONFIRMED" }),
      db.collection("Order").countDocuments({ status: "SHIPPED" }),
      db.collection("Order").countDocuments({ status: "DELIVERED" }),
      db.collection("Order").countDocuments({ status: "CANCELLED" }),
      db.collection("ContactSubmission").countDocuments({ read: false }),
      db.collection("Coupon").countDocuments(),
      db.collection("Coupon").countDocuments({ active: true }),
      db.collection("Order").aggregate([
        { $match: { status: { $nin: ["CANCELLED", "REFUNDED"] } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]).toArray(),
      db.collection("Order").find()
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ customerName: 1, total: 1, status: 1, createdAt: 1 })
        .toArray(),
      db.collection("Product").find({ inStock: false })
        .limit(10)
        .project({ name: 1, images: 1 })
        .toArray(),
    ]);

    const revenueTotal = revenueAgg.length ? revenueAgg[0].total : 0;

    res.json({
      ok: true,
      data: {
        products: { total: totalProducts, featured: featuredProducts },
        categories: { total: totalCategories },
        orders: {
          total: totalOrders,
          byStatus: {
            pending: pendingOrders,
            confirmed: confirmedOrders,
            shipped: shippedOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders,
          },
        },
        revenue: { total: revenueTotal },
        contacts: { unread: unreadContacts },
        coupons: { total: totalCoupons, active: activeCoupons },
        recentOrders: recentOrders.map((o) => ({ ...o, id: o._id.toString() })),
        lowStockProducts: lowStockProducts.map((p) => ({ ...p, id: p._id.toString() })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export const analyticsRoutes = router;
