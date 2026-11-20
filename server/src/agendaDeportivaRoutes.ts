import { Router, type Request, type Response, type NextFunction } from "express";
import { PrismaClient, ActivityType } from "@prisma/client";
import jwt from "jsonwebtoken";

export function createAgendaDeportivaRoutes(
  prisma: PrismaClient,
  jwtSecret: string
) {
  const router = Router();
  const allowedSports = new Set<string>(Object.values(ActivityType));

  async function requireSuperAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    let userId: string;

    try {
      const decoded = jwt.verify(authorization.slice(7), jwtSecret);

      if (typeof decoded === "string" || !decoded.userId) {
        res.status(401).json({ error: "Token invalido" });
        return;
      }

      userId = String(decoded.userId);
    } catch {
      res.status(401).json({ error: "Token invalido" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true },
      });

      if (!user?.isActive || user.role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Acceso denegado" });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  function validateEvent(body: any) {
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const locality = typeof body?.locality === "string" ? body.locality.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const organizer = typeof body?.organizer === "string" ? body.organizer.trim() : "";
    const websiteUrl = typeof body?.websiteUrl === "string" ? body.websiteUrl.trim() : "";

    if (!title || title.length > 50) throw new Error("Titulo invalido (maximo 50 caracteres)");
    if (!locality || locality.length > 40) throw new Error("Localidad invalida (maximo 40 caracteres)");
    if (!description || !organizer || !websiteUrl) {
      throw new Error("Descripcion, organizador y sitio oficial son obligatorios");
    }

    let url: URL;
    try {
      url = new URL(websiteUrl);
    } catch {
      throw new Error("Sitio oficial invalido");
    }

    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("El sitio oficial debe utilizar HTTP o HTTPS");
    }

    const eventDate = new Date(body?.eventDate);
    const endDate = body?.endDate ? new Date(body.endDate) : null;

    if (!body?.eventDate || Number.isNaN(eventDate.getTime())) {
      throw new Error("Fecha de inicio invalida");
    }

    if (endDate && (Number.isNaN(endDate.getTime()) || endDate < eventDate)) {
      throw new Error("Fecha de finalizacion invalida");
    }

    if (
      !Array.isArray(body?.sports) ||
      body.sports.length === 0 ||
      body.sports.some(
        (sport: unknown) =>
          typeof sport !== "string" || !allowedSports.has(sport)
      )
    ) {
      throw new Error("Seleccion de deportes invalida");
    }

    if (typeof body?.isActive !== "boolean") {
      throw new Error("El estado de publicacion es obligatorio");
    }

    return {
      title,
      locality,
      description,
      organizer,
      websiteUrl,
      eventDate,
      endDate,
      sports: [...new Set(body.sports)] as ActivityType[],
      isActive: body.isActive,
    };
  }

  router.get("/", async (req, res, next) => {
    try {
      const sport = typeof req.query.sport === "string" ? req.query.sport : "";

      if (!allowedSports.has(sport)) {
        res.status(400).json({ error: "Deporte invalido" });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const events = await prisma.agendaDeportivaEvento.findMany({
        where: {
          isActive: true,
          sports: { has: sport as ActivityType },
          OR: [
            { endDate: { gte: today } },
            { endDate: null, eventDate: { gte: today } },
          ],
        },
        orderBy: { eventDate: "asc" },
      });

      res.json(events);
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin", requireSuperAdmin, async (_req, res, next) => {
    try {
      const events = await prisma.agendaDeportivaEvento.findMany({
        orderBy: { eventDate: "asc" },
      });
      res.json(events);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireSuperAdmin, async (req, res, next) => {
    let data;
    try {
      data = validateEvent(req.body);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Datos invalidos",
      });
      return;
    }

    try {
      const event = await prisma.agendaDeportivaEvento.create({ data });
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", requireSuperAdmin, async (req, res, next) => {
    let data;
    try {
      data = validateEvent(req.body);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Datos invalidos",
      });
      return;
    }

    try {
      const event = await prisma.agendaDeportivaEvento.update({
        where: { id: String(req.params.id) },
        data,
      });
      res.json(event);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireSuperAdmin, async (req, res, next) => {
    try {
      await prisma.agendaDeportivaEvento.delete({
        where: { id: String(req.params.id) },
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}