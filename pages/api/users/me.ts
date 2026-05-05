import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getAuthToken, verifyToken } from "../../../lib/auth";
import { errorResponse, successResponse } from "../../../lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getAuthToken(req);
  if (!token) {
    return errorResponse(res, "Unauthorized", 401);
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, "Invalid token", 401);
  }
}
