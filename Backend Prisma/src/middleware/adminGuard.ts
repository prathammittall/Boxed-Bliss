import { Request, Response, NextFunction } from "express";
import { verifyAdminToken, COOKIE_NAME } from "../lib/auth";

/**
 * Parses the admin JWT from the cookie and attaches payload to req.
 * Returns 401 if the token is missing or invalid.
 */
export async function adminGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  // Attach admin info to request for downstream use
  (req as Request & { admin: typeof payload }).admin = payload;
  next();
}
