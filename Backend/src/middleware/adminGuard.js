const { verifyAdminToken, COOKIE_NAME } = require("../lib/auth");

/**
 * Parses the admin JWT from the cookie and attaches payload to req.
 * Returns 401 if the token is missing or invalid.
 */
async function adminGuard(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

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
