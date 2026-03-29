import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function shouldRetryUploadError(error) {
  if (!error || typeof error !== "object") return false;
  const code = error.code;
  if (typeof code !== "string") return false;
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(code);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a buffer to Cloudinary with retry logic.
 * Returns { url, publicId }
 */
async function uploadToCloudinary(fileBuffer, folder = "boxed-bliss/products") {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const uploaded = await new Promise((resolve, reject) => {
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
async function deleteFromCloudinary(publicId) {
  await cloudinary.uploader.destroy(publicId);
}

export { uploadToCloudinary, deleteFromCloudinary, cloudinary };
