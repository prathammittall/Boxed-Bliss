import { Router, Request, Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../lib/cloudinary";
import { adminGuard } from "../middleware/adminGuard";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// POST /api/upload  (admin only)
router.post("/", adminGuard, upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const folder = (req.body.folder as string | undefined) ?? "boxed-bliss/products";
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.json({ ok: true, url: result.url, publicId: result.publicId });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Image upload failed" });
  }
});

// POST /api/upload/multiple  (admin only, up to 10 images)
router.post("/multiple", adminGuard, upload.array("images", 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No image files provided" });
      return;
    }

    const folder = (req.body.folder as string | undefined) ?? "boxed-bliss/products";
    const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer, folder)));

    res.json({ ok: true, images: uploads });
  } catch (err) {
    console.error("Multiple upload error:", err);
    res.status(500).json({ error: "Image upload failed" });
  }
});

export default router;
