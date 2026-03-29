import { Router } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../lib/cloudinary.js";
import { adminGuard } from "../middleware/adminGuard.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function isCloudinaryNetworkError(error) {
  if (!error || typeof error !== "object") return false;
  const code = error.code;
  if (typeof code !== "string") return false;
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(code);
}

function isAllowedImageUpload(file) {
  if (!file) return false;
  return ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype);
}

// POST /api/upload (admin only)
router.post("/", adminGuard, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    if (!isAllowedImageUpload(req.file)) {
      res.status(400).json({ error: "Only JPG, PNG, and WEBP images are allowed" });
      return;
    }

    const folder = req.body.folder ?? "boxed-bliss/products";
    const result = await uploadToCloudinary(req.file.buffer, folder);
    res.json({ ok: true, url: result.url, publicId: result.publicId });
  } catch (err) {
    console.error("Upload error:", err);
    if (isCloudinaryNetworkError(err)) {
      res.status(503).json({ error: "Cloudinary is temporarily unreachable. Please try again." });
      return;
    }
    res.status(500).json({ error: "Image upload failed" });
  }
});

// POST /api/upload/payment-proof (public checkout uploads)
router.post("/payment-proof", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No payment screenshot provided" });
      return;
    }

    if (!isAllowedImageUpload(req.file)) {
      res.status(400).json({ error: "Only JPG, PNG, and WEBP images are allowed" });
      return;
    }

    const result = await uploadToCloudinary(req.file.buffer, "boxed-bliss/payments");
    res.json({ ok: true, url: result.url, publicId: result.publicId });
  } catch (err) {
    console.error("Payment proof upload error:", err);
    if (isCloudinaryNetworkError(err)) {
      res.status(503).json({ error: "Cloudinary is temporarily unreachable. Please try again." });
      return;
    }
    res.status(500).json({ error: "Payment screenshot upload failed" });
  }
});

// POST /api/upload/multiple (admin only, up to 10 images)
router.post("/multiple", adminGuard, upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No image files provided" });
      return;
    }

    const folder = req.body.folder ?? "boxed-bliss/products";
    const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer, folder)));
    res.json({ ok: true, images: uploads });
  } catch (err) {
    console.error("Multiple upload error:", err);
    if (isCloudinaryNetworkError(err)) {
      res.status(503).json({ error: "Cloudinary is temporarily unreachable. Please try again." });
      return;
    }
    res.status(500).json({ error: "Image upload failed" });
  }
});

export const uploadRoutes = router;
