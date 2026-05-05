import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getAuthToken, verifyToken } from "../../../lib/auth";
import { errorResponse, normalizeEmail, successResponse, validateEmail, validateRequiredText } from "../../../lib/security";

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
    const projects = await prisma.project.findMany({
      where:
        payload.role === "ADMIN"
          ? undefined
          : {
              OR: [
                { ownerId: payload.userId },
                { members: { some: { id: payload.userId } } },
              ],
            },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(res, { projects });
  }

  if (req.method === "POST") {
    if (payload.role !== "ADMIN") {
      return errorResponse(res, "Only admins can create projects and manage teams.", 403);
    }

    const { name, description, members } = req.body;
    if (!validateRequiredText(name, 2, 100)) {
      return errorResponse(res, "Project name must be between 2 and 100 characters.");
    }

    if (!validateRequiredText(description, 1, 500)) {
      return errorResponse(res, "Project description is required and must be under 500 characters.");
    }

    const memberEmails = Array.isArray(members)
      ? Array.from(new Set(members.map((email) => (typeof email === "string" ? normalizeEmail(email) : "")).filter(Boolean)))
      : [];

    const invalidEmail = memberEmails.find((email) => !validateEmail(email));
    if (invalidEmail) {
      return errorResponse(res, `Invalid team member email: ${invalidEmail}`);
    }

    const users = memberEmails.length
      ? await prisma.user.findMany({
          where: { email: { in: memberEmails } },
          select: { id: true, email: true },
        })
      : [];
    const foundEmails = new Set(users.map((user) => user.email));
    const missingEmails = memberEmails.filter((email) => !foundEmails.has(email));
    if (missingEmails.length) {
      return errorResponse(res, `Team member not found: ${missingEmails.join(", ")}`);
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        owner: { connect: { id: payload.userId } },
        members: { connect: users.map((user) => ({ id: user.id })) },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, name: true, email: true } },
      },
    });

    return successResponse(res, { project }, 201);
  }

  return errorResponse(res, "Method not allowed", 405);
}
