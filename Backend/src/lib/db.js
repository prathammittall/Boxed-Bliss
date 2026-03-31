import "dotenv/config";
import dns from "dns";
import { MongoClient, ObjectId } from "mongodb";

// Force Node.js to use Google/Cloudflare DNS instead of the system default,
// which may fail to resolve MongoDB Atlas SRV records on some networks.
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

/** @type {import("mongodb").Db | null} */
let db = null;

/** @type {MongoClient | null} */
let client = null;

/**
 * Connect to MongoDB and return the database instance.
 * Reuses the same connection across the app.
 */
async function connectDb() {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[db] DATABASE_URL is not set. Add it to your environment variables.");
  }

  client = new MongoClient(url);
  await client.connect();
  db = client.db(); // uses the db name from the connection string
  console.log("✅ Connected to MongoDB");

  // Create indexes
  await ensureIndexes(db);

  return db;
}

/**
 * Get the database instance (must call connectDb first).
 */
function getDb() {
  if (!db) throw new Error("[db] Not connected. Call connectDb() first.");
  return db;
}

/**
 * Gracefully disconnect.
 */
async function disconnectDb() {
  if (client) {
    await client.close();
    db = null;
    client = null;
  }
}

/**
 * Create required indexes on startup.
 */
async function ensureIndexes(database) {
  await database.collection("Category").createIndex({ slug: 1 }, { unique: true });
  await database.collection("Product").createIndex({ slug: 1 }, { unique: true });
  await database.collection("Coupon").createIndex({ code: 1 }, { unique: true });
  await database.collection("Order").createIndex({ createdAt: -1 });
  await database.collection("PaymentAttempt").createIndex({ gatewayOrderId: 1 }, { unique: true });
  await database.collection("PaymentAttempt").createIndex({ status: 1, createdAt: -1 });
  await database.collection("ContactSubmission").createIndex({ createdAt: -1 });
  console.log("✅ Database indexes ensured");
}

/**
 * Convert a string id to ObjectId safely, returns null if invalid.
 */
function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export { connectDb, getDb, disconnectDb, toObjectId, ObjectId };
