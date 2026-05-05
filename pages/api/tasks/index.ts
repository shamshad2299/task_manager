import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getAuthToken, verifyToken } from "../../../lib/auth";
import { errorResponse, successResponse, validateRequiredText } from "../../../lib/security";

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

  if (req.method === "GET") {
    const tasks = await prisma.task.findMany({
      where:
        payload.role === "ADMIN"
          ? undefined
          : {
              OR: [
                { project: { ownerId: payload.userId } },
                { assigneeId: payload.userId },
                { project: { members: { some: { id: payload.userId } } } },
              ],
            },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(res, { tasks });
  }

  if (req.method === "POST") {
    const { title, description, projectId, assigneeId, dueDate } = req.body;
    if (!validateRequiredText(title, 2, 140)) {
      return errorResponse(res, "Task title must be between 2 and 140 characters.");
    }

    if (!validateRequiredText(projectId, 1, 120)) {
      return errorResponse(res, "Project is required.");
    }

    if (description !== undefined && typeof description !== "string") {
      return errorResponse(res, "Task description must be text.");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { select: { id: true } },
      },
    });

    if (!project) {
      return errorResponse(res, "Project not found.", 404);
    }

    const canCreateTask = payload.role === "ADMIN" || project.ownerId === payload.userId;
    if (!canCreateTask) {
      return errorResponse(res, "Only admins or the project owner can create tasks.", 403);
    }

    const projectUserIds = new Set([project.ownerId, ...project.members.map((member) => member.id)]);
    if (assigneeId && !projectUserIds.has(assigneeId)) {
      return errorResponse(res, "Assignee must be the project owner or a project member.");
    }

    let parsedDueDate: Date | undefined;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return errorResponse(res, "Due date is invalid.");
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        project: { connect: { id: projectId } },
        assignee: assigneeId ? { connect: { id: assigneeId } } : undefined,
        dueDate: parsedDueDate,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
    });

    return successResponse(res, { task }, 201);
  }

  return errorResponse(res, "Method not allowed", 405);
}
