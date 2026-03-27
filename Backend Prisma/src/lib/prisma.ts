import "dotenv/config";
import { PrismaClient } from "../../generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "[prisma] DATABASE_URL is not set. Add it to your environment variables on Render."
    );
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
  });
}

// Reuse singleton in development (hot-reload safe); always fresh in production.
const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient()));

export { prisma };
export default prisma;