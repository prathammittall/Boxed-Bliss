const { Router } = require("express");
const { getDb, toObjectId, ObjectId } = require("../lib/db");
const { adminGuard } = require("../middleware/adminGuard");

const router = Router();

// GET /api/products — public listing with filters
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const { category, featured, inStock, search } = req.query;
    const page = parseInt(req.query.page ?? "1", 10);
    const limit = parseInt(req.query.limit ?? "20", 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (category) filter.categoryId = toObjectId(category);
    if (featured === "true") filter.featured = true;
    if (inStock === "true") filter.inStock = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const col = db.collection("Product");
    const [total, products] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    // Fetch categories for each product
    const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))];
    const categories = categoryIds.length
      ? await db.collection("Category").find({ _id: { $in: categoryIds } }).toArray()
      : [];
    const catMap = new Map(categories.map((c) => [c._id.toString(), { id: c._id.toString(), name: c.name, slug: c.slug }]));

    // Fetch variants for each product
    const productIds = products.map((p) => p._id);
    const variants = productIds.length
      ? await db.collection("ProductVariant").find({ productId: { $in: productIds } }).toArray()
      : [];
    const variantMap = new Map();
    for (const v of variants) {
      const pid = v.productId.toString();
      if (!variantMap.has(pid)) variantMap.set(pid, []);
      variantMap.get(pid).push({ ...v, id: v._id.toString() });
    }

    const data = products.map((p) => ({
      ...p,
      id: p._id.toString(),
      category: catMap.get(p.categoryId?.toString()) ?? null,
      variants: variantMap.get(p._id.toString()) ?? [],
    }));

    res.json({
      ok: true,
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);

    // Try by _id first, then by slug
    let product = oid ? await db.collection("Product").findOne({ _id: oid }) : null;
    if (!product) {
      product = await db.collection("Product").findOne({ slug: req.params.id });
    }
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    // Fetch category
    const category = product.categoryId
      ? await db.collection("Category").findOne({ _id: product.categoryId })
      : null;

    // Fetch variants
    const variants = await db.collection("ProductVariant").find({ productId: product._id }).toArray();

    res.json({
      ok: true,
      data: {
        ...product,
        id: product._id.toString(),
        category: category ? { ...category, id: category._id.toString() } : null,
        variants: variants.map((v) => ({ ...v, id: v._id.toString() })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products (admin)
router.post("/", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const { name, slug, description, price, comparePrice, images, inStock, featured, categoryId, variants } = req.body;

    if (!name || !slug || price === undefined || !categoryId) {
      res.status(400).json({ error: "name, slug, price, and categoryId are required" });
      return;
    }

    const catOid = toObjectId(categoryId);
    const catExists = await db.collection("Category").findOne({ _id: catOid }, { projection: { _id: 1 } });
    if (!catExists) { res.status(400).json({ error: "Invalid categoryId" }); return; }

    const now = new Date();
    const doc = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
      description: description || null,
      price,
      comparePrice: comparePrice ?? null,
      images: images ?? [],
      inStock: inStock ?? true,
      featured: featured ?? false,
      categoryId: catOid,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("Product").insertOne(doc);
    const productId = result.insertedId;

    // Create variants if provided
    let createdVariants = [];
    if (variants && variants.length) {
      const variantDocs = variants.map((v) => ({
        productId,
        label: v.label,
        value: v.value,
        price: v.price ?? null,
        createdAt: now,
      }));
      await db.collection("ProductVariant").insertMany(variantDocs);
      createdVariants = variantDocs.map((v, i) => ({ ...v, id: v._id?.toString() }));
    }

    res.status(201).json({
      ok: true,
      data: { ...doc, id: productId.toString(), _id: productId, variants: createdVariants },
    });
  } catch (err) {
    if (err.code === 11000) { res.status(409).json({ error: "Slug already exists" }); return; }
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/products/:id (admin)
router.put("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const { name, slug, description, price, comparePrice, images, inStock, featured, categoryId } = req.body;
    const update = { updatedAt: new Date() };
    if (name) update.name = name;
    if (slug) update.slug = slug.toLowerCase().replace(/\s+/g, "-");
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = price;
    if (comparePrice !== undefined) update.comparePrice = comparePrice;
    if (images !== undefined) update.images = images;
    if (inStock !== undefined) update.inStock = inStock;
    if (featured !== undefined) update.featured = featured;
    if (categoryId !== undefined) update.categoryId = categoryId ? toObjectId(categoryId) : null;

    const result = await db.collection("Product").findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) { res.status(404).json({ error: "Product not found" }); return; }

    // Fetch variants and category
    const variants = await db.collection("ProductVariant").find({ productId: oid }).toArray();
    const category = result.categoryId
      ? await db.collection("Category").findOne({ _id: result.categoryId })
      : null;

    res.json({
      ok: true,
      data: {
        ...result,
        id: result._id.toString(),
        variants: variants.map((v) => ({ ...v, id: v._id.toString() })),
        category: category ? { ...category, id: category._id.toString() } : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id (admin)
router.delete("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    // Delete variants first
    await db.collection("ProductVariant").deleteMany({ productId: oid });

    const result = await db.collection("Product").deleteOne({ _id: oid });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Product not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ── Variant management ───────────────────────────────────────────────────────

// POST /api/products/:id/variants (admin)
router.post("/:id/variants", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const productId = toObjectId(req.params.id);
    if (!productId) { res.status(400).json({ error: "Invalid id" }); return; }

    const { label, value, price } = req.body;
    const doc = { productId, label, value, price: price ?? null, createdAt: new Date() };
    const result = await db.collection("ProductVariant").insertOne(doc);
    res.status(201).json({ ok: true, data: { ...doc, id: result.insertedId.toString(), _id: result.insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add variant" });
  }
});

// DELETE /api/products/:id/variants/:variantId (admin)
router.delete("/:id/variants/:variantId", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const variantOid = toObjectId(req.params.variantId);
    if (!variantOid) { res.status(400).json({ error: "Invalid variantId" }); return; }

    await db.collection("ProductVariant").deleteOne({ _id: variantOid });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete variant" });
  }
});

module.exports = router;
