import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function shouldRetryUploadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode !== "string") return false;
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(maybeCode);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a buffer or file path to Cloudinary.
 * Returns { url, publicId }
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder = "boxed-bliss/products"
): Promise<{ url: string; publicId: string }> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const uploaded = await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error("Upload failed"));
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        );
        stream.end(fileBuffer);
      });

      return uploaded;
    } catch (error) {
      lastError = error;
      if (!shouldRetryUploadError(error) || attempt === maxAttempts) {
        throw error;
      }
      await delay(300 * attempt);
    }
  }

  throw lastError ?? new Error("Upload failed");
}

/**
 * Delete an image from Cloudinary by its publicId.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
