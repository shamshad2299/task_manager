import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getAuthToken, verifyToken } from "../../../lib/auth";
import { errorResponse, successResponse } from "../../../lib/security";

const ALLOWED_STATUSES = new Set(["TODO", "IN_PROGRESS", "DONE"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getAuthToken(req);
  if (!token) {
    return errorResponse(res, "Unauthorized", 401);
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return errorResponse(res, "Invalid token", 401);
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return errorResponse(res, "Invalid task id.");
  }

  if (req.method === "PATCH") {
    const { status } = req.body;
    if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
      return errorResponse(res, "Status must be TODO, IN_PROGRESS, or DONE.");
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) {
      return errorResponse(res, "Task not found.", 404);
    }

    const isProjectOwner = task.project.ownerId === payload.userId;
    const canUpdate = payload.role === "ADMIN" || isProjectOwner || task.assigneeId === payload.userId;
    if (!canUpdate) {
      return errorResponse(res, "Forbidden to update this task.", 403);
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
    });

    return successResponse(res, { task: updated });
  }

  return errorResponse(res, "Method not allowed", 405);
}
