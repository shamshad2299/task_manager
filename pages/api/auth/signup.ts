import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { hashPassword, createToken } from "../../../lib/auth";
import { checkRateLimit, validateEmail, validatePassword, validateName, normalizeEmail, errorResponse, successResponse } from "../../../lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return errorResponse(res, "Method not allowed", 405);
  }

  // Rate limiting per IP
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(`signup:${ip}`, 5, 3600000)) {
    return errorResponse(res, "Too many signup attempts. Please try again later.", 429);
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const { name, email, password } = body as { name?: unknown; email?: unknown; password?: unknown };
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? normalizeEmail(email) : "";

  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name || !email || !password) {
    return errorResponse(res, "Name, email and password are required.");
  }

  if (!validateName(cleanName)) {
    return errorResponse(res, "Name must be between 2 and 100 characters.");
  }

  if (!validateEmail(cleanEmail)) {
    return errorResponse(res, "Invalid email format.");
  }

  if (!validatePassword(password)) {
    return errorResponse(res, "Password must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return errorResponse(res, "Email already registered.");
  }

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "ADMIN" : "MEMBER";
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      password: passwordHash,
      role,
    },
  });

  const token = createToken({ userId: user.id, email: user.email, role: user.role });
  return successResponse(res, { token, role: user.role }, 201);
}
