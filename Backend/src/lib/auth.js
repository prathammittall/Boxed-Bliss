const { SignJWT, jwtVerify } = require("jose");
const bcrypt = require("bcryptjs");

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? "fallback-secret-change-me-in-production"
);

const COOKIE_NAME = "bb_admin_token";
const EXPIRES_IN = "7d";

/**
 * Hash a plaintext password.
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

/**
 * Compare plaintext against a hash.
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Sign an admin JWT token.
 */
async function signAdminToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);
}

/**
 * Verify an admin JWT token. Returns the payload or null.
 */
async function verifyAdminToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signAdminToken, verifyAdminToken, COOKIE_NAME };
