import { Router } from "express";
import { getDb, toObjectId } from "../lib/db.js";
import { adminGuard } from "../middleware/adminGuard.js";

const router = Router();

/** Helper: build category tree by attaching children recursively */
function buildTree(allCategories, parentId = null) {
  return allCategories
    .filter((c) => {
      if (parentId === null) return c.parentId == null;
      return c.parentId && c.parentId.toString() === parentId.toString();
    })
    .map((c) => ({
      ...c,
      id: c._id.toString(),
      children: buildTree(allCategories, c._id),
    }));
}

// GET /api/categories — public, returns full tree
router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    const allCategories = await db
      .collection("Category")
      .find()
      .sort({ name: 1 })
      .toArray();

    const tree = buildTree(allCategories, null);
    res.json({ ok: true, data: tree });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/flat — all categories flat list
router.get("/flat", async (_req, res) => {
  try {
    const db = getDb();
    const categories = await db
      .collection("Category")
      .find()
      .sort({ name: 1 })
      .toArray();
    const data = categories.map((c) => ({ ...c, id: c._id.toString() }));
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/:id
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const category = await db.collection("Category").findOne({ _id: oid });
    if (!category) { res.status(404).json({ error: "Category not found" }); return; }

    // Fetch children
    const children = await db.collection("Category").find({ parentId: oid }).toArray();
    // Fetch up to 12 products
    const products = await db.collection("Product").find({ categoryId: oid }).limit(12).toArray();

    res.json({
      ok: true,
      data: {
        ...category,
        id: category._id.toString(),
        children: children.map((c) => ({ ...c, id: c._id.toString() })),
        products: products.map((p) => ({ ...p, id: p._id.toString() })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// POST /api/categories (admin)
router.post("/", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const { name, slug, description, parentId, image } = req.body;

    if (!name || !slug) {
      res.status(400).json({ error: "name and slug are required" });
      return;
    }

    const now = new Date();
    const doc = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
      description: description || null,
      image: typeof image === "string" && image.trim().length > 0 ? image.trim() : null,
      parentId: parentId ? toObjectId(parentId) : null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("Category").insertOne(doc);
    res.status(201).json({ ok: true, data: { ...doc, id: result.insertedId.toString(), _id: result.insertedId } });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id (admin)
router.put("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const { name, slug, description, parentId, image } = req.body;
    const update = { updatedAt: new Date() };
    if (name) update.name = name;
    if (slug) update.slug = slug.toLowerCase().replace(/\s+/g, "-");
    if (description !== undefined) update.description = description;
    if (parentId !== undefined) update.parentId = parentId ? toObjectId(parentId) : null;
    if (image !== undefined) {
      update.image = typeof image === "string" && image.trim().length > 0 ? image.trim() : null;
    }

    const result = await db.collection("Category").findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result) { res.status(404).json({ error: "Category not found" }); return; }
    res.json({ ok: true, data: { ...result, id: result._id.toString() } });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id (admin)
router.delete("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    // Move children to top-level before deletion
    await db.collection("Category").updateMany(
      { parentId: oid },
      { $set: { parentId: null } }
    );

    const result = await db.collection("Category").deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export const categoryRoutes = router;
