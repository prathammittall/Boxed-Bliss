const { Router } = require("express");
const { getDb, toObjectId } = require("../lib/db");
const { adminGuard } = require("../middleware/adminGuard");

const router = Router();

// GET /api/contacts (admin)
router.get("/", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const { read } = req.query;
    const page = parseInt(req.query.page ?? "1", 10);
    const limit = parseInt(req.query.limit ?? "20", 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (read === "true") filter.read = true;
    if (read === "false") filter.read = false;

    const col = db.collection("ContactSubmission");
    const [total, contacts] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    const data = contacts.map((c) => ({ ...c, id: c._id.toString() }));
    res.json({
      ok: true,
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET /api/contacts/:id (admin)
router.get("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const contact = await db.collection("ContactSubmission").findOne({ _id: oid });
    if (!contact) { res.status(404).json({ error: "Submission not found" }); return; }

    // Auto-mark as read on view
    if (!contact.read) {
      await db.collection("ContactSubmission").updateOne({ _id: oid }, { $set: { read: true } });
    }

    res.json({ ok: true, data: { ...contact, id: contact._id.toString(), read: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST /api/contacts (public — from contact form)
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({ error: "name, email, and message are required" });
      return;
    }

    const doc = {
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      read: false,
      createdAt: new Date(),
    };

    const result = await db.collection("ContactSubmission").insertOne(doc);
    res.status(201).json({ ok: true, data: { ...doc, id: result.insertedId.toString(), _id: result.insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

// PUT /api/contacts/:id — toggle read (admin)
router.put("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const { read } = req.body;
    const result = await db.collection("ContactSubmission").findOneAndUpdate(
      { _id: oid },
      { $set: { read } },
      { returnDocument: "after" }
    );
    if (!result) { res.status(404).json({ error: "Submission not found" }); return; }
    res.json({ ok: true, data: { ...result, id: result._id.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// DELETE /api/contacts/:id (admin)
router.delete("/:id", adminGuard, async (req, res) => {
  try {
    const db = getDb();
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ error: "Invalid id" }); return; }

    const result = await db.collection("ContactSubmission").deleteOne({ _id: oid });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Submission not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

module.exports = router;
