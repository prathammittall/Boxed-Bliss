import { readdir } from "node:fs/promises";
import { join } from "node:path";

const BRAND_IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i;

export async function getBrandImages() {
  const dirPath = join(process.cwd(), "public", "brand");
  const files = await readdir(dirPath);

  return files
    .filter((file) => BRAND_IMAGE_EXT_RE.test(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => `/brand/${file}`);
}

export async function getBrandImagesExcluding(excludedNames: string[]) {
  const brandImages = await getBrandImages();
  const excluded = new Set(excludedNames);

  return brandImages.filter((src) => {
    const name = src.replace("/brand/", "");
    return !excluded.has(name);
  });
}

