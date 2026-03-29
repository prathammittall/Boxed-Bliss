import { verifyAdminToken, COOKIE_NAME } from "../lib/auth.js";

/**
 * Parses the admin JWT from the Authorization header (Bearer) or cookie.
 * Returns 401 if the token is missing or invalid.
 */
async function adminGuard(req, res, next) {
  const cookieToken = req.cookies?.[COOKIE_NAME] ?? null;
  const authHeader = req.headers.authorization ?? "";
  const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ error: "Unauthorized: no token" });
    return;
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
    return;
  }

  req.admin = payload;
  next();
}

export { adminGuard };
