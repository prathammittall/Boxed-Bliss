import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { adminGuard } from "../middleware/adminGuard";

const router = Router();

// GET /api/analytics  (admin)
router.get("/", adminGuard, async (_req: Request, res: Response) => {
  try {
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
      revenueResult,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { featured: true } }),
      prisma.category.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "SHIPPED" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.contactSubmission.count({ where: { read: false } }),
      prisma.coupon.count(),
      prisma.coupon.count({ where: { active: true } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, customerName: true, total: true,
          status: true, createdAt: true,
        },
      }),
      prisma.product.findMany({
        where: { inStock: false },
        select: { id: true, name: true, images: true },
        take: 10,
      }),
    ]);

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
        revenue: {
          total: revenueResult._sum.total ?? 0,
        },
        contacts: { unread: unreadContacts },
        coupons: { total: totalCoupons, active: activeCoupons },
        recentOrders,
        lowStockProducts,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
