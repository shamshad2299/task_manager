import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getAuthToken, verifyToken } from "../../../lib/auth";
import { errorResponse, successResponse } from "../../../lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "Method not allowed", 405);
  }

  const token = getAuthToken(req);
  if (!token) {
    return errorResponse(res, "Unauthorized", 401);
  }

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") {
      return errorResponse(res, "Only admins can view team users.", 403);
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return successResponse(res, { users });
  } catch {
    return errorResponse(res, "Invalid token", 401);
  }
}
