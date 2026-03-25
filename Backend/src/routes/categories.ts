import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { adminGuard } from "../middleware/adminGuard";
import { getQueryString } from "../lib/queryHelper";

const router = Router();

// GET /api/categories  — public, returns full tree
router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null }, // top-level only
      include: {
        children: {
          include: {
            children: true, // nested up to 2 levels
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json({ ok: true, data: categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/flat  — all categories flat list
router.get("/flat", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ ok: true, data: categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = getQueryString(req.params.id) ?? req.params.id;
    const category = await prisma.category.findUnique({
      where: { id },
      include: { children: true, products: { take: 12 } },
    });
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ ok: true, data: category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// POST /api/categories  (admin)
router.post("/", adminGuard, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, parentId } = req.body as {
      name: string;
      slug: string;
      description?: string;
      parentId?: string;
    };

    if (!name || !slug) {
      res.status(400).json({ error: "name and slug are required" });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        description,
        parentId: parentId || null,
      },
    });

    res.status(201).json({ ok: true, data: category });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id  (admin)
router.put("/:id", adminGuard, async (req: Request, res: Response) => {
    const id = getQueryString(req.params.id) ?? req.params.id;
  try {
    const { name, slug, description, parentId } = req.body as {
      name?: string;
      slug?: string;
      description?: string;
      parentId?: string | null;
    };

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug: slug.toLowerCase().replace(/\s+/g, "-") }),
        ...(description !== undefined && { description }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });
    res.json({ ok: true, data: category });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id  (admin)
router.delete("/:id", adminGuard, async (req: Request, res: Response) => {
    const id = getQueryString(req.params.id) ?? req.params.id;
  try {
    // Move children to top-level before deletion
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });

    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
