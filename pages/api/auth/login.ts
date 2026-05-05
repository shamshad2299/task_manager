import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { comparePassword, createToken } from "../../../lib/auth";
import { checkRateLimit, validateEmail, normalizeEmail, errorResponse, successResponse } from "../../../lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return errorResponse(res, "Method not allowed", 405);
  }

  // Rate limiting per IP
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(`login:${ip}`, 20, 3600000)) {
    return errorResponse(res, "Too many login attempts. Please try again later.", 429);
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const { email, password } = body as { email?: unknown; password?: unknown };
  const cleanEmail = typeof email === "string" ? normalizeEmail(email) : "";

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return errorResponse(res, "Email and password are required.");
  }

  if (!validateEmail(cleanEmail)) {
    return errorResponse(res, "Invalid email format.");
  }

  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user) {
    return errorResponse(res, "Invalid credentials.", 401);
  }

  const validPassword = await comparePassword(password, user.password);
  if (!validPassword) {
    return errorResponse(res, "Invalid credentials.", 401);
  }

  const token = createToken({ userId: user.id, email: user.email, role: user.role });
  return successResponse(res, { token, role: user.role });
}
