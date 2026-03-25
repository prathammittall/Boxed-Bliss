import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { adminGuard } from "../middleware/adminGuard";
import { getQueryString } from "../lib/queryHelper";

const router = Router();

// GET /api/products  — public listing with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const category = getQueryString(req.query.category);
    const featured = getQueryString(req.query.featured);
    const inStock = getQueryString(req.query.inStock);
    const search = getQueryString(req.query.search);
    const page = parseInt(getQueryString(req.query.page) ?? "1", 10);
    const limit = parseInt(getQueryString(req.query.limit) ?? "20", 10);

    const skip = (page - 1) * limit;
    const take = limit;

    type WhereClause = {
      categoryId?: string;
      featured?: boolean;
      inStock?: boolean;
      OR?: Array<{ name?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
    };

    const where: WhereClause = {};
    if (category) where.categoryId = category;
    if (featured === "true") where.featured = true;
    if (inStock === "true") where.inStock = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    res.json({
      ok: true,
      data: products,
      meta: { total, page, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id  — public
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        category: true,
        variants: true,
      },
    });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ ok: true, data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products  (admin)
router.post("/", adminGuard, async (req: Request, res: Response) => {
  try {
    const {
      name, slug, description, price, comparePrice,
      images, inStock, featured, categoryId, variants,
    } = req.body as {
      name: string;
      slug: string;
      description?: string;
      price: number;
      comparePrice?: number;
      images?: string[];
      inStock?: boolean;
      featured?: boolean;
      categoryId?: string;
      variants?: { label: string; value: string; price?: number }[];
    };

    if (!name || !slug || price === undefined || !categoryId) {
      res.status(400).json({ error: "name, slug, price, and categoryId are required" });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      res.status(400).json({ error: "Invalid categoryId" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        description,
        price,
        comparePrice,
        images: images ?? [],
        inStock: inStock ?? true,
        featured: featured ?? false,
        categoryId,
        variants: variants
          ? { create: variants.map((v) => ({ label: v.label, value: v.value, price: v.price ?? null })) }
          : undefined,
      },
      include: { variants: true, category: true },
    });

    res.status(201).json({ ok: true, data: product });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/products/:id  (admin)
router.put("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    const {
      name, slug, description, price, comparePrice,
      images, inStock, featured, categoryId,
    } = req.body as {
      name?: string;
      slug?: string;
      description?: string;
      price?: number;
      comparePrice?: number;
      images?: string[];
      inStock?: boolean;
      featured?: boolean;
      categoryId?: string | null;
    };

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug: slug.toLowerCase().replace(/\s+/g, "-") }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(comparePrice !== undefined && { comparePrice }),
        ...(images !== undefined && { images }),
        ...(inStock !== undefined && { inStock }),
        ...(featured !== undefined && { featured }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
      },
      include: { variants: true, category: true },
    });

    res.json({ ok: true, data: product });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id  (admin)
router.delete("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ── Variant management ───────────────────────────────────────────────────────

// POST /api/products/:id/variants  (admin)
router.post("/:id/variants", adminGuard, async (req: Request, res: Response) => {
  try {
    const { label, value, price } = req.body as { label: string; value: string; price?: number };
    const id = getQueryString(req.params.id) ?? req.params.id;
    const variant = await prisma.productVariant.create({
      data: { productId: id, label, value, price: price ?? null },
    });
    res.status(201).json({ ok: true, data: variant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add variant" });
  }
});

// DELETE /api/products/:id/variants/:variantId  (admin)
router.delete("/:id/variants/:variantId", adminGuard, async (req: Request, res: Response) => {
  try {
    const variantId = getQueryString(req.params.variantId) ?? req.params.variantId;
    await prisma.productVariant.delete({ where: { id: variantId } });
    res.json({ ok: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete variant" });
  }
});

export default router;
