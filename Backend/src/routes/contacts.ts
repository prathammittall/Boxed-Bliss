import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { adminGuard } from "../middleware/adminGuard";

const router = Router();

// GET /api/contacts  (admin)
router.get("/", adminGuard, async (req: Request, res: Response) => {
  try {
    const { read, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    type ContactWhere = { read?: boolean };
    const where: ContactWhere = {};
    if (read === "true") where.read = true;
    if (read === "false") where.read = false;

    const [total, contacts] = await Promise.all([
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take,
      }),
    ]);

    res.json({
      ok: true, data: contacts,
      meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET /api/contacts/:id  (admin)
router.get("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contactSubmission.findUnique({ where: { id: req.params.id } });
    if (!contact) { res.status(404).json({ error: "Submission not found" }); return; }

    // Auto-mark as read on view
    if (!contact.read) {
      await prisma.contactSubmission.update({ where: { id: req.params.id }, data: { read: true } });
    }

    res.json({ ok: true, data: { ...contact, read: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST /api/contacts  (public — from contact form)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body as {
      name: string;
      email: string;
      phone?: string;
      subject?: string;
      message: string;
    };

    if (!name || !email || !message) {
      res.status(400).json({ error: "name, email, and message are required" });
      return;
    }

    const submission = await prisma.contactSubmission.create({
      data: { name, email, phone, subject, message },
    });

    res.status(201).json({ ok: true, data: submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

// PUT /api/contacts/:id  — toggle read (admin)
router.put("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    const { read } = req.body as { read: boolean };
    const contact = await prisma.contactSubmission.update({
      where: { id: req.params.id },
      data: { read },
    });
    res.json({ ok: true, data: contact });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Submission not found" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// DELETE /api/contacts/:id  (admin)
router.delete("/:id", adminGuard, async (req: Request, res: Response) => {
  try {
    await prisma.contactSubmission.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      res.status(404).json({ error: "Submission not found" }); return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
