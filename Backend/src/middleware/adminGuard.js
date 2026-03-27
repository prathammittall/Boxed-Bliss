const { verifyAdminToken, COOKIE_NAME } = require("../lib/auth");

/**
 * Parses the admin JWT from the Authorization header (Bearer) or cookie.
 * Returns 401 if the token is missing or invalid.
 */
async function adminGuard(req, res, next) {
  // Prefer Authorization header (used for cross-origin requests from Vercel)
  let token = null;
  const authHeader = req.headers["authorization"] ?? "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    token = req.cookies?.[COOKIE_NAME] ?? null;
  }

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

module.exports = { adminGuard };
