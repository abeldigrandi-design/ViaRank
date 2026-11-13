import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";

type RegisterExternalActivityInput = {
  userId: string;
  startDate: string;
  endDate: string;
  distanceKm: number;
  notes?: string;
  confirmOverlap?: boolean;
};

export function registerGroupExternalActivities(
  app: Express,
  prisma: PrismaClient,
  getAuthenticatedUserId: (req: import("express").Request) => string | null
) {
  app.post(
    "/api/groups/:groupId/external-activities",
    async (req: any, res: any) => {
      try {
        const groupId = String(req.params.groupId || "");
        const requesterId = getAuthenticatedUserId(req);

        if (!requesterId) {
          return res.status(401).json({
            error: "Sesión no válida"
          });
        }

        const group = await prisma.sportGroup.findUnique({
          where: { id: groupId },
          select: {
            id: true,
            sport: true,
            administratorId: true
          }
        });

        if (!group) {
          return res.status(404).json({
            error: "Grupo no encontrado"
          });
        }

        const requester = await prisma.user.findUnique({
          where: { id: requesterId },
          select: { role: true }
        });

        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: requesterId,
              groupId
            }
          },
          select: {
            canValidateExternalKm: true
          }
        });

        const authorized =
          requester?.role === "SUPER_ADMIN" ||
          group.administratorId === requesterId ||
          membership?.canValidateExternalKm === true;

        if (!authorized) {
          return res.status(403).json({
            error: "No tenés permiso para registrar kilómetros ADMIN"
          });
        }

        const body = req.body as RegisterExternalActivityInput;

        const userId = String(body?.userId || "");
        const startDate = new Date(body?.startDate);
        const endDate = new Date(body?.endDate);
        const distanceKm = Number(body?.distanceKm);

        if (
          !userId ||
          !Number.isFinite(startDate.getTime()) ||
          !Number.isFinite(endDate.getTime()) ||
          endDate <= startDate ||
          !Number.isFinite(distanceKm) ||
          distanceKm <= 0
        ) {
          return res.status(400).json({
            error: "Datos de actividad inválidos"
          });
        }

        const athleteMembership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId
            }
          },
          select: { userId: true }
        });

        if (!athleteMembership) {
          return res.status(400).json({
            error: "El atleta no pertenece al grupo"
          });
        }

        const existingActivities = await prisma.activity.findMany({
          where: {
            userId,
            type: group.sport,
            startDate: { lt: endDate }
          },
          select: {
            id: true,
            startDate: true,
            movingTime: true
          }
        });

        const externalActivities =
          await prisma.groupExternalActivity.findMany({
            where: {
              groupId,
              userId,
              startDate: { lt: endDate },
              endDate: { gt: startDate }
            },
            select: {
              id: true,
              startDate: true,
              endDate: true
            }
          });

        // VIARANK_ADMIN_KM_DUPLICATES_V1
        // Impedir repetir una actividad ADMIN con los mismos datos.
        const duplicate = await prisma.groupExternalActivity.findFirst({
          where: {
            groupId,
            userId,
            startDate,
            endDate,
            distance: distanceKm * 1000
          },
          select: { id: true }
        });

        if (duplicate) {
          return res.status(409).json({
            error: "Esta actividad ADMIN ya fue registrada",
            duplicate: true
          });
        }
        const overlaps = [
          ...existingActivities
            .filter((activity) => {
              const activityEnd = new Date(
                activity.startDate.getTime() +
                activity.movingTime * 1000
              );

              return activity.startDate < endDate &&
                activityEnd > startDate;
            })
            .map((activity) => ({
              id: activity.id,
              source: "ACTIVITY"
            })),
          ...externalActivities.map((activity) => ({
            id: activity.id,
            source: "ADMIN"
          }))
        ];

        if (overlaps.length > 0 && body.confirmOverlap !== true) {
          return res.status(409).json({
            requiresConfirmation: true,
            error: "Se detectaron actividades superpuestas",
            overlaps
          });
        }

        const created = await prisma.groupExternalActivity.create({
          data: {
            groupId,
            userId,
            registeredById: requesterId,
            startDate,
            endDate,
            distance: distanceKm * 1000,
            notes: typeof body.notes === "string"
              ? body.notes.trim()
              : null
          }
        });

        return res.status(201).json({
          success: true,
          source: "ADMIN",
          activity: {
            ...created,
            distanceKm
          },
          overlapConfirmed: overlaps.length > 0
        });
      } catch (error) {
        // VIARANK_ADMIN_KM_P2002_V1
        // Prisma P2002: la base rechazo una actividad duplicada.
        if (
          error !== null &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return res.status(409).json({
            success: false,
            duplicate: true,
            error: "Esta actividad ADMIN ya fue registrada"
          });
        }

        console.error(
          "Error registrando kilómetros ADMIN:",
          error
        );

        return res.status(500).json({
          error: "No se pudo registrar la actividad ADMIN"
        });
      }
    }
  );
}