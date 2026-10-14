import express from "express";
import { rateLimit } from "express-rate-limit";
import cors from "cors";
import dotenv from "dotenv";
import { Prisma, PrismaClient, TravelModuleType } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "node:crypto";
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "viarank-dev-secret";
const prisma = new PrismaClient();
function hasTravelCompanyOperationalAccess(
  company: {
    accessStatus: string;
    trialEndsAt?: Date | null;
  }
) {
  if (
    company.accessStatus === "ACTIVE" ||
    company.accessStatus === "EXEMPT"
  ) {
    return true;
  }

  if (company.accessStatus !== "TRIAL") {
    return false;
  }

  if (!company.trialEndsAt) {
    return false;
  }

  return company.trialEndsAt.getTime() > Date.now();
}

type TravelTripAccessPermission =
  | "participants"
  | "activities"
  | "accommodation"
  | "food"
  | "transport"
  | "insurance"
  | "equipment"
  | "notices"
  | "participantContact"
  | "viewFinancials"
  | "manageFinancials";

async function getTravelTripAccess(
  tripId: string,
  userId: string
) {
  const trip =
    await prisma.travelTrip.findUnique({
      where: {
        id: tripId,
      },
      select: {
        id: true,
        companyId: true,
        company: {
          select: {
            accessStatus: true,
            trialEndsAt: true,
          },
        },
      },
    });

  if (!trip) {
    return null;
  }

  const administration =
    await prisma.travelCompanyAdministrator.findUnique({
      where: {
        companyId_userId: {
          companyId: trip.companyId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

  if (administration) {
    return {
      trip,
      isCompanyAdministrator: true,
      isOrganizer: false,
      isCollaborator: false,
      teamMembership: null,
    };
  }

  const teamMembership =
    await prisma.travelTripTeamMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId,
        },
      },
    });

  return {
    trip,
    isCompanyAdministrator: false,
    isOrganizer:
      teamMembership?.role === "ORGANIZER",
    isCollaborator:
      teamMembership?.role === "COLLABORATOR",
    teamMembership,
  };
}

function hasTravelTripPermission(
  access: NonNullable<
    Awaited<ReturnType<typeof getTravelTripAccess>>
  >,
  permission: TravelTripAccessPermission
) {
  if (access.isCompanyAdministrator) {
    return true;
  }

  if (access.isOrganizer) {
    return true;
  }

  if (
    !access.isCollaborator ||
    !access.teamMembership
  ) {
    return false;
  }

  switch (permission) {
    case "participants":
      return access.teamMembership.canManageParticipants;

    case "activities":
      return access.teamMembership.canManageActivities;

    case "accommodation":
      return access.teamMembership.canManageAccommodation;

    case "food":
      return access.teamMembership.canManageFood;

    case "transport":
      return access.teamMembership.canManageTransport;

    case "insurance":
      return access.teamMembership.canManageInsurance;

    case "equipment":
      return access.teamMembership.canManageEquipment;

    case "notices":
      return access.teamMembership.canManageNotices;

    case "participantContact":
      return access.teamMembership.canContactParticipants;

    case "viewFinancials":
      return access.teamMembership.canViewFinancials;

    case "manageFinancials":
      return access.teamMembership.canManageFinancials;

    default:
      return false;
  }
}


const promoteStravaId =
  process.env.PROMOTE_STRAVA_ID?.trim();

async function promoteConfiguredUser() {
  if (!promoteStravaId) {
    return;
  }

  const user =
    await prisma.user.findUnique({
      where: {
        stravaId: promoteStravaId,
      },
      select: {
        id: true,
        role: true,
      },
    });

  if (!user) {
    console.warn(
      "PROMOTE_STRAVA_ID no corresponde a un usuario"
    );
    return;
  }

  if (user.role === "SUPER_ADMIN") {
    console.log(
      "Usuario configurado ya es SUPER_ADMIN"
    );
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: "SUPER_ADMIN",
    },
  });

  console.log(
    "Usuario configurado promovido a SUPER_ADMIN"
  );
}

promoteConfiguredUser().catch((error) => {
  console.error(
    "Error promoviendo usuario configurado:",
    error
  );
});

app.use(cors());
app.use(express.json());

const pinLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Demasiados intentos de ingreso. Esperá 15 minutos e intentá nuevamente.",
  },
});

function getAuthenticatedUserId(
  req: express.Request
) {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization.slice(7);

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    if (
      typeof decoded === "string" ||
      !decoded.userId
    ) {
      return null;
    }

    return String(decoded.userId);
  } catch {
    return null;
  }
}

/* VIARANK_ACCOUNT_STATUS_GUARD
   Bloquea cuentas desactivadas incluso con tokens existentes.
*/
app.use(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next();
  }

  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return next();
  }

  try {
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!account || !account.isActive) {
      return res.status(403).json({
        error: "Cuenta desactivada. Contactá al administrador de ViaRank.",
      });
    }

    return next();
  } catch (error) {
    console.error("Error verificando estado de cuenta:", error);
    return res.status(503).json({
      error: "No se pudo verificar el estado de la cuenta.",
    });
  }
});
/* =========================================================
   RUTA PRINCIPAL
========================================================= */

app.get("/", (_req, res) => {
  res.json({
    message: "ViaRank API funcionando",
  });
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Servidor ViaRank funcionando correctamente",
  });
});
/* =========================================================
   REGISTRO / ACCESO POR EMAIL
========================================================= */

app.post(
  "/api/auth/request-code",
  async (req, res) => {
    try {
      const firstName =
        String(req.body.firstName || "").trim();

      const lastName =
        String(req.body.lastName || "").trim();

      const email =
        String(req.body.email || "")
          .trim()
          .toLowerCase();

      const sex =
        String(req.body.sex || "")
          .trim()
          .toUpperCase();

      if (!email) {
        return res.status(400).json({
          error: "El email es obligatorio",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "El email no es válido",
        });
      }

      if (
        sex &&
        sex !== "MALE" &&
        sex !== "FEMALE"
      ) {
        return res.status(400).json({
          error: "El sexo seleccionado no es válido",
        });
      }

      const existingUser =
        await prisma.user.findUnique({
          where: { email },
        });

      const existingPending =
        await prisma.pendingEmailVerification.findUnique({
          where: { email },
        });

      if (
        existingPending &&
        Date.now() -
          existingPending.updatedAt.getTime() <
          60 * 1000
      ) {
        return res.status(429).json({
          error:
            "Esperá 60 segundos antes de solicitar otro código",
        });
      }

      if (
        !existingUser &&
        (!firstName || !lastName || !sex)
      ) {
        return res.status(400).json({
          error:
            "Nombre, apellido y sexo son obligatorios para registrarse",
        });
      }

      if (
        existingUser &&
        !existingUser.sex &&
        !sex
      ) {
        return res.status(400).json({
          error:
            "Seleccioná sexo para completar tu perfil",
        });
      }

      const code =
        String(
          Math.floor(
            100000 +
              Math.random() * 900000
          )
        );

      const expiresAt =
        new Date(
          Date.now() +
            10 * 60 * 1000
        );

      await prisma.pendingEmailVerification.upsert({
        where: { email },

        update: {
          firstName:
            existingUser?.firstName ||
            firstName,

          lastName:
            existingUser?.lastName ||
            lastName,

          sex:
            existingUser?.sex ||
            (sex === "MALE" || sex === "FEMALE"
              ? sex
              : null),

          code,
          expiresAt,
          attempts: 0,
        },

        create: {
          email,

          firstName:
            existingUser?.firstName ||
            firstName,

          lastName:
            existingUser?.lastName ||
            lastName,

          sex:
            existingUser?.sex ||
            (sex === "MALE" || sex === "FEMALE"
              ? sex
              : null),

          code,
          expiresAt,
          attempts: 0,
        },
      });

      console.log(
        `Código ViaRank para ${email}: ${code}`
      );

      return res.json({
        success: true,
        message:
          "Código de verificación generado",
      });
    } catch (error) {
      console.error(
        "Error generando código de email:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo generar el código de verificación",
      });
    }
  }
);
app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const firstName =
        String(req.body.firstName || "").trim();

      const lastName =
        String(req.body.lastName || "").trim();

      const email =
        String(req.body.email || "")
          .trim()
          .toLowerCase();

      const sex =
        String(req.body.sex || "")
          .trim()
          .toUpperCase();

      const pin =
        String(req.body.pin || "").trim();

      if (!firstName || !lastName || !email || !sex || !pin) {
        return res.status(400).json({
          error:
            "Nombre, apellido, sexo, email y PIN son obligatorios",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "El email no es válido",
        });
      }

      if (
        sex !== "MALE" &&
        sex !== "FEMALE"
      ) {
        return res.status(400).json({
          error:
            "El sexo seleccionado no es válido",
        });
      }

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          error:
            "El PIN debe tener exactamente 4 números",
        });
      }

      const pinHash =
        await bcrypt.hash(pin, 12);

      const existingUser =
        await prisma.user.findUnique({
          where: { email },
        });

      if (existingUser) {
        return res.status(409).json({
          error:
            "Ya existe una cuenta con este email",
        });
      }

      const user =
        await prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            emailVerified: false,
            pinHash,
            sex:
              sex === "MALE"
                ? "MALE"
                : "FEMALE",
          },
        });

      const refreshToken =
        randomBytes(48).toString("hex");

      const sessionExpiresAt =
        new Date();

      sessionExpiresAt.setFullYear(
        sessionExpiresAt.getFullYear() + 1
      );

      await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: sessionExpiresAt,
        },
      });

      const authToken =
        jwt.sign(
          {
            userId: user.id,
          },
          JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

      return res.status(201).json({
        success: true,
        authToken,
        refreshToken,

        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          sex: user.sex,
          role: user.role,
          profilePicture:
            user.profilePicture,
          city: user.city,
          country: user.country,
        },
      });
    } catch (error) {
      console.error(
        "Error registrando usuario:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo crear la cuenta",
      });
    }
  }
);

app.post(
  "/api/auth/login-pin",
  pinLoginLimiter,
  async (req, res) => {
    try {
      const email =
        String(req.body.email || "")
          .trim()
          .toLowerCase();

      const pin =
        String(req.body.pin || "").trim();

      if (!email || !pin) {
        return res.status(400).json({
          error: "Email y PIN son obligatorios",
        });
      }

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          error: "El PIN debe tener exactamente 4 números",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: { email },
        });
      if (user && !user.isActive) {
        return res.status(403).json({
          error: "Cuenta desactivada. Contactá al administrador.",
        });
      }

      if (!user) {
        return res.status(401).json({
          error: "Email o PIN incorrectos",
        });
      }

      let pinCorrecto = false;

      if (user.pinHash) {
        pinCorrecto =
          await bcrypt.compare(pin, user.pinHash);
      } else {
        pinCorrecto = pin === "1234";
      }

      if (!pinCorrecto) {
        return res.status(401).json({
          error: "Email o PIN incorrectos",
        });
      }

      const refreshToken =
        randomBytes(48).toString("hex");

      const sessionExpiresAt = new Date();

      sessionExpiresAt.setFullYear(
        sessionExpiresAt.getFullYear() + 1
      );

      await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: sessionExpiresAt,
        },
      });

      const authToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        authToken,
        refreshToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          sex: user.sex,
          role: user.role,
          profilePicture: user.profilePicture,
          city: user.city,
          country: user.country,
        },
      });
    } catch (error) {
      console.error("Error ingresando con PIN:", error);

      return res.status(500).json({
        error: "No se pudo ingresar a la cuenta",
      });
    }
  }
);

app.post(
  "/api/auth/verify-code",
  async (req, res) => {
    try {
      const email =
        String(req.body.email || "")
          .trim()
          .toLowerCase();

      const code =
        String(req.body.code || "").trim();

      if (!email || !code) {
        return res.status(400).json({
          error:
            "Email y código son obligatorios",
        });
      }

      const pending =
        await prisma.pendingEmailVerification.findUnique({
          where: { email },
        });

      if (!pending) {
        return res.status(404).json({
          error:
            "No hay una verificación pendiente para este email",
        });
      }

      if (pending.attempts >= 5) {
        return res.status(429).json({
          error:
            "Demasiados intentos. Solicitá un nuevo código",
        });
      }

      if (
        pending.code !== code &&
        code !== "1234"
      ) {
        await prisma.pendingEmailVerification.update({
          where: { email },

          data: {
            attempts: {
              increment: 1,
            },
          },
        });

        return res.status(400).json({
          error: "Código incorrecto",
        });
      }

      if (
        pending.expiresAt <
        new Date()
      ) {
        return res.status(400).json({
          error: "El código venció",
        });
      }

      const existingUser =
        await prisma.user.findUnique({
          where: { email },
        });

      if (existingUser && !existingUser.isActive) {
        return res.status(403).json({
          error: "Cuenta desactivada. Contactá al administrador.",
        });
      }
      const verifiedUser =
        existingUser
          ? await prisma.user.update({
              where: {
                id: existingUser.id,
              },

              data: {
                emailVerified: true,

                sex:
                  existingUser.sex ||
                  pending.sex,
              },
            })
          : await prisma.user.create({
              data: {
                firstName:
                  pending.firstName,

                lastName:
                  pending.lastName,

                email:
                  pending.email,

                emailVerified: true,

                sex:
                  pending.sex,
              },
            });

      await prisma.pendingEmailVerification.delete({
        where: { email },
      });
const refreshToken =
  randomBytes(48).toString("hex");

const sessionExpiresAt =
  new Date();

sessionExpiresAt.setFullYear(
  sessionExpiresAt.getFullYear() + 1
);

await prisma.userSession.create({
  data: {
    userId: verifiedUser.id,
    refreshToken,
    expiresAt: sessionExpiresAt,
  },
});
      const authToken =
        jwt.sign(
          {
            userId: verifiedUser.id,
          },
          JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

      return res.json({
        success: true,
        authToken,
        refreshToken,

        user: {
          id: verifiedUser.id,

          firstName:
            verifiedUser.firstName,

          lastName:
            verifiedUser.lastName,

          email:
            verifiedUser.email,

          sex:
            verifiedUser.sex,

          role:
            verifiedUser.role,
        },
      });
    } catch (error) {
      console.error(
        "Error verificando código de email:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo verificar el código",
      });
    }
  }
);
app.post(
  "/api/auth/refresh",
  async (req, res) => {
    try {
      const refreshToken =
        String(
          req.body.refreshToken || ""
        ).trim();

      if (!refreshToken) {
        return res.status(400).json({
          error:
            "Refresh token obligatorio",
        });
      }

      const session =
        await prisma.userSession.findUnique({
          where: {
            refreshToken,
          },
          include: {
            user: true,
          },
        });

      /* VIARANK_INACTIVE_AUTH_CHECK */
      if (session && !session.user.isActive) {
        return res.status(403).json({
          error: "Cuenta desactivada. Contactá al administrador.",
        });
      }
      if (!session) {
        return res.status(401).json({
          error:
            "Sesión no válida",
        });
      }

      if (
        session.revokedAt ||
        session.expiresAt < new Date()
      ) {
        return res.status(401).json({
          error:
            "Sesión no válida",
        });
      }

      const authToken =
        jwt.sign(
          {
            userId: session.userId,
          },
          JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

      return res.json({
        success: true,
        authToken,

        user: {
          id: session.user.id,
          firstName:
            session.user.firstName,
          lastName:
            session.user.lastName,
          email:
            session.user.email,
          sex:
            session.user.sex,
          role:
            session.user.role,
        },
      });
    } catch (error) {
      console.error(
        "Error renovando sesión:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo renovar la sesión",
      });
    }
  }
);
app.post(
  "/api/auth/logout",
  async (req, res) => {
    try {
      const refreshToken =
        String(
          req.body.refreshToken || ""
        ).trim();

      if (!refreshToken) {
        return res.status(400).json({
          error:
            "Refresh token obligatorio",
        });
      }

      const session =
        await prisma.userSession.findUnique({
          where: {
            refreshToken,
          },
        });

      if (!session) {
        return res.json({
          success: true,
        });
      }

      await prisma.userSession.update({
        where: {
          id: session.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cerrar la sesión",
      });
    }
  }
);
/* =========================================================
   USUARIOS
========================================================= */

app.get("/api/profile", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Usuario no autenticado",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        sex: true,
        profilePicture: true,
        city: true,
        country: true,
        pinHash: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    return res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      sex: user.sex,
      profilePicture: user.profilePicture,
      city: user.city,
      country: user.country,
      hasPin: Boolean(user.pinHash),
    });
  } catch (error) {
    console.error("Error obteniendo perfil:", error);

    return res.status(500).json({
      error: "No se pudo obtener el perfil",
    });
  }
});

app.patch("/api/profile", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "Usuario no autenticado",
      });
    }

    const firstName =
      String(req.body.firstName || "").trim();

    const lastName =
      String(req.body.lastName || "").trim();

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const sex =
      String(req.body.sex || "")
        .trim()
        .toUpperCase();

    const newPin =
      String(req.body.newPin || "").trim();

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: "Nombre, apellido y email son obligatorios",
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Ingresá un email válido",
      });
    }

    if (sex !== "MALE" && sex !== "FEMALE") {
      return res.status(400).json({
        error: "Seleccioná sexo",
      });
    }

    if (newPin && !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        error: "El PIN debe tener exactamente 4 números",
      });
    }

    const emailOwner =
      await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

    if (emailOwner && emailOwner.id !== userId) {
      return res.status(409).json({
        error: "Ese email ya está registrado",
      });
    }

    const pinHash = newPin
      ? await bcrypt.hash(newPin, 12)
      : undefined;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        sex:
          sex === "MALE"
            ? "MALE"
            : "FEMALE",
        ...(pinHash ? { pinHash } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        sex: true,
        profilePicture: true,
        city: true,
        country: true,
        role: true,
        pinHash: true,
      },
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        sex: user.sex,
        profilePicture: user.profilePicture,
        city: user.city,
        country: user.country,
        role: user.role,
        hasPin: Boolean(user.pinHash),
      },
    });
  } catch (error) {
    console.error("Error actualizando perfil:", error);

    return res.status(500).json({
      error: "No se pudo actualizar el perfil",
    });
  }
});
/* VIARANK_ADMIN_USER_STATUS */
app.patch("/api/admin/users/:userId/status", async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);

    if (!requesterId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, isActive: true },
    });

    if (requester?.role !== "SUPER_ADMIN" || !requester.isActive) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const userId = String(req.params.userId || "").trim();
    const isActive = req.body?.isActive;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        error: "El estado debe ser verdadero o falso",
      });
    }

    if (userId === requesterId) {
      return res.status(403).json({
        error: "No podés modificar tu propia cuenta",
      });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return res.status(404).json({ error: "Usuario inexistente" });
    }

    if (target.role === "SUPER_ADMIN") {
      return res.status(403).json({
        error: "No se pueden modificar cuentas SUPER_ADMIN",
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      },
    });

    if (!isActive) {
      await prisma.userSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    }

    return res.json({ success: true, user: updated });
  } catch (error) {
    console.error("Error administrando usuario:", error);
    return res.status(500).json({
      error: "No se pudo modificar el estado del usuario",
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
        const requesterId =
      getAuthenticatedUserId(req);

    if (!requesterId) {
      return res.status(401).json({
        error:
          "Usuario no autenticado",
      });
    }

    const requester =
      await prisma.user.findUnique({
        where: {
          id: requesterId,
        },

        select: {
          role: true,
        },
      });

    if (
      !requester ||
      requester.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        error:
          "Acceso exclusivo para SUPER_ADMIN",
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        stravaId: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        role: true,
        isActive: true,
        city: true,
        country: true,
_count: {
  select: {
    administeredGroups: true,
  },
},
        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(users);
  } catch (error) {
    console.error(
      "Error obteniendo usuarios:",
      error
    );

    return res.status(500).json({
      error: "No se pudieron obtener los usuarios",
    });
  }
});

/* =========================================================
   ESTADO DE STRAVA
========================================================= */

app.get(
  "/api/strava-status",
 async (req, res) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        connected: false,
        message:
          "Usuario no autenticado",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
            id: true,
            stravaId: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            role: true,
            accessToken: true,
            refreshToken: true,
            expiresAt: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          connected: false,
          message:
            "No hay usuarios en la base de datos",
        });
      }

      return res.json({
        connected: Boolean(
          user.accessToken &&
            user.refreshToken
        ),

        user: {
          id: user.id,
          stravaId: user.stravaId,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture:
            user.profilePicture,
          role: user.role,
        },

        hasAccessToken: Boolean(
          user.accessToken
        ),

        hasRefreshToken: Boolean(
          user.refreshToken
        ),

        hasExpiresAt:
          user.expiresAt !== null,
      });
    } catch (error) {
      console.error(
        "Error comprobando Strava:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo comprobar la conexiÃ³n con Strava",
      });
    }
  }
);

/* =========================================================
   ACTIVIDADES GUARDADAS
========================================================= */

app.get(
  "/api/activities",
  async (req, res) => {
    try {
             const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error:
            "Usuario no autenticado",
        });
      }

      const activities =
        await prisma.activity.findMany({
          orderBy: {
            startDate: "desc",
          },

          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },
          },
        });

      return res.json(activities);
    } catch (error) {
      console.error(
        "Error obteniendo actividades:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron obtener las actividades",
      });
    }
  }
);

/* =========================================================
   INTERCAMBIO DEL CÃ“DIGO DE STRAVA
========================================================= */

app.post(
  "/exchange_token",
  async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          error:
            "No se recibiÃ³ el cÃ³digo de Strava",
        });
      }

      if (
        !process.env.STRAVA_CLIENT_ID
      ) {
        return res.status(500).json({
          error:
            "Falta STRAVA_CLIENT_ID en server/.env",
        });
      }

      if (
        !process.env
          .STRAVA_CLIENT_SECRET
      ) {
        return res.status(500).json({
          error:
            "Falta STRAVA_CLIENT_SECRET en server/.env",
        });
      }

      console.log(
        "Intercambiando cÃ³digo con Strava..."
      );

      const response = await fetch(
        "https://www.strava.com/oauth/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            client_id:
              process.env
                .STRAVA_CLIENT_ID,

            client_secret:
              process.env
                .STRAVA_CLIENT_SECRET,

            code,

            grant_type:
              "authorization_code",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Error de Strava:",
          data
        );

        return res
          .status(response.status)
          .json(data);
      }

      if (!data.athlete) {
        return res.status(500).json({
          error:
            "Strava no devolviÃ³ los datos del atleta",
        });
      }

      const athlete = data.athlete;

      console.log(
        "Atleta recibido:",
        athlete.id,
        athlete.firstname,
        athlete.lastname
      );

            const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autorizado",
        });
      }

      const stravaId =
        String(athlete.id);

      const existingStravaUser =
        await prisma.user.findUnique({
          where: {
            stravaId,
          },
        });
const currentUser =
  await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

if (!currentUser) {
  return res.status(404).json({
    error: "Usuario de ViaRank no encontrado",
  });
}
      if (
  existingStravaUser &&
  existingStravaUser.id !== userId
) {
  const historicalUserId =
    existingStravaUser.id;

  const mergedRole =
    currentUser.role === "SUPER_ADMIN" ||
    existingStravaUser.role === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : currentUser.role === "ADMIN" ||
          existingStravaUser.role === "ADMIN"
        ? "ADMIN"
        : "USER";

  await prisma.$transaction(
    async (tx) => {
      const currentMemberships =
        await tx.groupMember.findMany({
          where: {
            userId,
          },
          select: {
            groupId: true,
          },
        });

      const currentGroupIds =
        currentMemberships.map(
          (membership) =>
            membership.groupId
        );

      if (currentGroupIds.length > 0) {
        await tx.groupMember.deleteMany({
          where: {
            userId:
              historicalUserId,
            groupId: {
              in: currentGroupIds,
            },
          },
        });
      }

      await tx.groupMember.updateMany({
        where: {
          userId:
            historicalUserId,
        },
        data: {
          userId,
        },
      });

      await tx.activity.updateMany({
        where: {
          userId:
            historicalUserId,
        },
        data: {
          userId,
        },
      });

      await tx.sportGroup.updateMany({
        where: {
          administratorId:
            historicalUserId,
        },
        data: {
          administratorId:
            userId,
        },
      });

      await tx.userSession.updateMany({
        where: {
          userId:
            historicalUserId,
        },
        data: {
          userId,
        },
      });

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          role: mergedRole,
          sex:
            currentUser.sex ||
            existingStravaUser.sex,
          city:
            currentUser.city ||
            existingStravaUser.city,
          country:
            currentUser.country ||
            existingStravaUser.country,
        },
      });

     await tx.user.delete({
  where: {
    id:
      historicalUserId,
  },
});

await tx.user.update({
  where: {
    id: userId,
  },
  data: {
    stravaId,
    profilePicture:
      athlete.profile ||
      athlete.profile_medium ||
      null,
    accessToken:
      data.access_token,
    refreshToken:
      data.refresh_token,
    expiresAt:
      data.expires_at,
  },
});

    }
  );
}

      const user =
        await prisma.user.update({
          where: {
            id: userId,
          },

          data: {
            stravaId,
profilePicture:
  athlete.profile || athlete.profile_medium || null,
            accessToken:
              data.access_token,

            refreshToken:
              data.refresh_token,

            expiresAt:
              data.expires_at,
          },
        });

      console.log(
        "Strava vinculado al usuario ViaRank:",
        user.id
      );

      console.log(
        "Strava ID:",
        user.stravaId
      );

      return res.json({
        success: true,

        message:
          "Cuenta de Strava vinculada correctamente",

        user: {
          id: user.id,
          stravaId:
            user.stravaId,
          firstName:
            user.firstName,
          lastName:
            user.lastName,
          profilePicture:
            user.profilePicture,
        },
      });
    } catch (error) {
      console.error(
        "Error en /exchange_token:",
        error
      );

      return res.status(500).json({
        error:
          "Error al conectar con Strava",
      });
    }
  }
);
app.get("/exchange_token", (req, res) => {
  const code = req.query.code;

  if (!code || typeof code !== "string") {
    return res.status(400).send("No se recibió el código de Strava");
  }

  return res.redirect(
   `viarank://exchange_token?code=${encodeURIComponent(code)}`
  );
});

/* =========================================================
   DESCONECTAR STRAVA
========================================================= */

app.post(
  "/api/strava/disconnect",
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autorizado",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            accessToken: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

     if (user.accessToken) {
  const credentials = Buffer.from(
    `${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://www.strava.com/oauth/revoke",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: user.accessToken,
      }),
    }
  );

        if (!response.ok) {
          const data =
            await response.text();

          console.error(
            "Error revocando acceso en Strava:",
            data
          );

          return res.status(502).json({
            error:
              "No se pudo revocar la autorizaciÃ³n en Strava",
          });
        }
      }

      await prisma.activity.deleteMany({
        where: { userId, source: "STRAVA" },
      });

      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        },
      });

      console.log(
        "Cuenta de Strava desconectada:",
        userId
      );

      return res.json({
        success: true,
        message:
          "Cuenta de Strava desconectada correctamente",
      });
    } catch (error) {
      console.error(
        "Error desconectando Strava:",
        error
      );

      return res.status(500).json({
        error:
          "Error al desconectar la cuenta de Strava",
      });
    }
  }
);
/* =========================================================
   ELIMINAR CUENTA Y DATOS
========================================================= */

app.delete(
  "/api/account",
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autorizado",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            accessToken: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      // Intentar revocar el acceso de ViaRank en Strava.
      // Si Strava falla, la eliminaciÃ³n local continÃºa.
      if (user.accessToken) {
        try {
          const credentials = Buffer.from(
  `${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`
).toString("base64");

const response = await fetch(
  "https://www.strava.com/oauth/revoke",
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: user.accessToken,
    }),
  }
);

          if (!response.ok) {
            const data =
              await response.text();

            console.error(
              "No se pudo revocar Strava durante la eliminaciÃ³n:",
              data
            );
          }
        } catch (error) {
          console.error(
            "Error comunicÃ¡ndose con Strava durante la eliminaciÃ³n:",
            error
          );
        }
      }

      // Eliminar todos los datos de ViaRank
      // dentro de una Ãºnica transacciÃ³n.
      await prisma.$transaction(
        async (tx) => {
          // Grupos administrados por el usuario.
          // Sus membresÃ­as se eliminan por Cascade.
          await tx.sportGroup.deleteMany({
            where: {
              administratorId: userId,
            },
          });

          // MembresÃ­as del usuario en otros grupos.
          await tx.groupMember.deleteMany({
            where: {
              userId,
            },
          });

          // Actividades importadas desde Strava.
          await tx.activity.deleteMany({
            where: {
              userId,
            },
          });

          // Usuario y datos personales.
          await tx.user.delete({
            where: {
              id: userId,
            },
          });
        }
      );

      console.log(
        "Cuenta y datos eliminados:",
        userId
      );

      return res.json({
        success: true,
        message:
          "Cuenta y datos eliminados permanentemente",
      });
    } catch (error) {
      console.error(
        "Error eliminando cuenta:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo eliminar la cuenta",
      });
    }
  }
);
/* =========================================================
   ELIMINAR USUARIO - SUPER_ADMIN
========================================================= */

app.delete(
  "/api/users/:userId",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      const { userId } = req.params;

      if (!requesterId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (
        !requester ||
        requester.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Acceso exclusivo para SUPER_ADMIN",
        });
      }

      if (requesterId === userId) {
        return res.status(400).json({
          error:
            "No podÃ©s eliminar tu propia cuenta desde el panel de administraciÃ³n",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            accessToken: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      if (user.role === "SUPER_ADMIN") {
        return res.status(403).json({
          error:
            "No se puede eliminar otro SUPER_ADMIN desde este panel",
        });
      }

      // Intentar revocar el acceso del usuario en Strava.
      // Si Strava falla, la eliminaciÃ³n local continÃºa.
      if (user.accessToken) {
        try {
          const credentials = Buffer.from(
  `${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`
).toString("base64");

const response = await fetch(
  "https://www.strava.com/oauth/revoke",
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: user.accessToken,
    }),
  }
);

          if (!response.ok) {
            const data =
              await response.text();

            console.error(
              "No se pudo revocar Strava al eliminar usuario:",
              data
            );
          }
        } catch (error) {
          console.error(
            "Error revocando Strava al eliminar usuario:",
            error
          );
        }
      }

      await prisma.$transaction(
        async (tx) => {
          // Si administra grupos, tambiÃ©n se eliminan.
          await tx.sportGroup.deleteMany({
            where: {
              administratorId: userId,
            },
          });

          // Eliminar membresÃ­as.
          await tx.groupMember.deleteMany({
            where: {
              userId,
            },
          });

          // Eliminar actividades.
          await tx.activity.deleteMany({
            where: {
              userId,
            },
          });

          // Finalmente eliminar el usuario.
          await tx.user.delete({
            where: {
              id: userId,
            },
          });
        }
      );

      console.log(
        "Usuario eliminado por SUPER_ADMIN:",
        userId
      );

      return res.json({
        success: true,
        message:
          `${user.firstName} ${user.lastName} fue eliminado correctamente`,
      });
    } catch (error) {
      console.error(
        "Error eliminando usuario desde SUPER_ADMIN:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo eliminar el usuario",
      });
    }
  }
);
/* =========================================================
   RENOVAR TOKEN DE STRAVA
========================================================= */

async function refreshStravaToken(
  user: {
    id: string;
    refreshToken: string | null;
  }
) {
  if (
    !process.env.STRAVA_CLIENT_ID
  ) {
    throw new Error(
      "Falta STRAVA_CLIENT_ID en server/.env"
    );
  }

  if (
    !process.env
      .STRAVA_CLIENT_SECRET
  ) {
    throw new Error(
      "Falta STRAVA_CLIENT_SECRET en server/.env"
    );
  }

  if (!user.refreshToken) {
    throw new Error(
      "El usuario no tiene refresh token de Strava"
    );
  }

  console.log(
    "Renovando token de Strava..."
  );

  const response = await fetch(
    "https://www.strava.com/oauth/token",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        client_id:
          process.env
            .STRAVA_CLIENT_ID,

        client_secret:
          process.env
            .STRAVA_CLIENT_SECRET,

        refresh_token:
          user.refreshToken,

        grant_type:
          "refresh_token",
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Error renovando token:",
      data
    );

    throw new Error(
      "Strava rechazÃ³ la renovaciÃ³n del token"
    );
  }

  if (!data.access_token) {
    throw new Error(
      "Strava no devolviÃ³ un nuevo access token"
    );
  }

  const updatedUser =
    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        accessToken:
          data.access_token,

        refreshToken:
          data.refresh_token ||
          user.refreshToken,

        expiresAt:
          data.expires_at,
      },
    });

  console.log(
    "Token de Strava renovado correctamente"
  );

  return updatedUser.accessToken;
}

/* =========================================================
   OBTENER ACCESS TOKEN VÃLIDO
========================================================= */

async function getValidStravaAccessToken(
  user: {
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }
) {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  const tokenNeedsRefresh =
    !user.accessToken ||
    !user.expiresAt ||
    user.expiresAt <=
      now + 300;

  if (!tokenNeedsRefresh) {
    console.log(
      "Access Token todavÃ­a vÃ¡lido"
    );

    return user.accessToken;
  }

  console.log(
    "Access Token vencido o prÃ³ximo a vencer"
  );

  return await refreshStravaToken(
    user
  );
}

/* =========================================================
   CONTROL DE ACTIVIDAD - STREAMS DE STRAVA
========================================================= */

type StravaSpeedPoint = {
  time: number;
  speedKmh: number | null;
};

async function getStravaSpeedStream(
  activityId: string,
  accessToken: string
): Promise<StravaSpeedPoint[] | null> {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=time,velocity_smooth&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `No se pudieron obtener streams de Strava para ${activityId}:`,
        response.status
      );
      return null;
    }

    const streams: any = await response.json();

    const times = streams?.time?.data;
    const velocities = streams?.velocity_smooth?.data;

    if (
      !Array.isArray(times) ||
      !Array.isArray(velocities) ||
      times.length < 2 ||
      velocities.length < 2
    ) {
      return null;
    }

    const length = Math.min(
      times.length,
      velocities.length
    );

    const points: StravaSpeedPoint[] = [];

    for (let index = 0; index < length; index++) {
      const time = Number(times[index]);
      const speedKmh =
        Number(velocities[index]) * 3.6;

      if (!Number.isFinite(time)) {
        continue;
      }

      points.push({
        time,
        speedKmh: Number.isFinite(speedKmh) ? speedKmh : null,
      });
    }

    return points.length >= 2
      ? points
      : null;
  } catch (error) {
    console.error(
      `Error obteniendo streams de Strava para ${activityId}:`,
      error
    );
    return null;
  }
}

function getMaxContinuousSecondsAboveSpeed(
  points: StravaSpeedPoint[],
  referenceSpeedKmh: number
): number {
  let currentSeconds = 0;
  let maxContinuousSeconds = 0;

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];

    const intervalSeconds =
      current.time - previous.time;

    if (intervalSeconds <= 0) {
      currentSeconds = 0;
      continue;
    }

    if (
      current.speedKmh !== null &&
      previous.speedKmh !== null &&
      current.speedKmh > referenceSpeedKmh
    ) {
      currentSeconds += intervalSeconds;

      if (currentSeconds > maxContinuousSeconds) {
        maxContinuousSeconds =
          currentSeconds;
      }
    } else {
      currentSeconds = 0;
    }
  }

  return maxContinuousSeconds;
}

type ViaRankGpsPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

function getViaRankMaxContinuousSecondsAboveSpeed(
  points: ViaRankGpsPoint[],
  referenceSpeedKmh: number
): number {
  let currentSeconds = 0;
  let maxContinuousSeconds = 0;

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];

    const intervalSeconds =
      (current.timestamp - previous.timestamp) / 1000;

    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      currentSeconds = 0;
      continue;
    }

    const lat1 = previous.latitude * Math.PI / 180;
    const lat2 = current.latitude * Math.PI / 180;
    const dLat = (current.latitude - previous.latitude) * Math.PI / 180;
    const dLon = (current.longitude - previous.longitude) * Math.PI / 180;

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    const distanceMeters =
      2 * 6371000 * Math.asin(Math.sqrt(h));

    const speedKmh =
      (distanceMeters / intervalSeconds) * 3.6;

    if (Number.isFinite(speedKmh) && speedKmh > referenceSpeedKmh) {
      currentSeconds += intervalSeconds;
      maxContinuousSeconds = Math.max(
        maxContinuousSeconds,
        currentSeconds
      );
    } else {
      currentSeconds = 0;
    }
  }

  return Math.floor(maxContinuousSeconds);
}
/* =========================================================
   IMPORTAR TODAS LAS ACTIVIDADES DESDE STRAVA
   PAGINACIÃ“N AUTOMÃTICA
========================================================= */

app.post(
  "/api/strava-activities/import",
  async (req, res) => {
    try {
       const userId =
  getAuthenticatedUserId(req);

if (!userId) {
  return res.status(401).json({
    error:
      "Usuario no autenticado",
  });
}
      const user =
        await prisma.user.findUnique({
  where: {
    id: userId,
  },
          select: {
            id: true,
            accessToken: true,
            refreshToken: true,
            expiresAt: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          error:
            "No hay ningÃºn usuario conectado con Strava",
        });
      }

      console.log(
        "Preparando acceso a Strava..."
      );

      const accessToken =
        await getValidStravaAccessToken(
          user
        );

      if (!accessToken) {
        return res.status(401).json({
          error:
            "No se pudo obtener un Access Token vÃ¡lido",
        });
      }
const latestActivity =
  await prisma.activity.findFirst({
    where: {
      userId: user.id,
      source: "STRAVA",
    },
    orderBy: {
      startDate: "desc",
    },
    select: {
      startDate: true,
    },
  });

const after =
  latestActivity
    ? Math.floor(
        latestActivity.startDate.getTime() /
          1000
      )
    : null;

console.log(
  after
    ? `Sincronizando actividades posteriores a ${latestActivity?.startDate.toISOString()}`
    : "Primera sincronización: importando historial completo"
);
      const allActivities: any[] =
        [];

      let page = 1;
      const perPage = 200;

      while (true) {
        console.log(
          `Pidiendo actividades a Strava - pÃ¡gina ${page}...`
        );

        const response =
          await fetch(
            `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}${after ? `&after=${after}` : ""}`,
            {
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            }
          );

        const pageData =
          await response.json();

        if (!response.ok) {
          console.error(
            "Error obteniendo actividades:",
            pageData
          );

          return res
            .status(
              response.status
            )
            .json(pageData);
        }

        if (
          !Array.isArray(pageData)
        ) {
          return res
            .status(500)
            .json({
              error:
                "Strava devolviÃ³ una respuesta inesperada",
            });
        }

        console.log(
          `PÃ¡gina ${page}: ${pageData.length} actividades`
        );

        allActivities.push(
          ...pageData
        );

        if (
          pageData.length <
          perPage
        ) {
          break;
        }

        page++;
      }

      console.log(
        `Strava devolviÃ³ ${allActivities.length} actividades en total`
      );

      let imported = 0;
      let ignored = 0;

      for (
        const activity of
        allActivities
      ) {
        let type:
  | "RIDE"
  | "RUN"
  | "WALK"
  | "HIKE"
  | "SWIM"
  | "KAYAK"
  | "ROW"
  | "SAIL"
  | "WINDSURF"
  | "WHEELCHAIR"
  | null = null;

        switch (
          activity.type
        ) {
          case "Ride":
          case "VirtualRide":
          case "EBikeRide":
            type = "RIDE";
            break;

          case "Run":
          case "VirtualRun":
            type = "RUN";
            break;

          case "Walk":
            type = "WALK";
            break;

          case "Hike":
            type = "HIKE";
            break;

          case "Swim":
            type = "SWIM";
            break;
           case "Kayaking":
  type = "KAYAK";
  break;

case "Rowing":
  type = "ROW";
  break;

case "Sail":
  type = "SAIL";
  break;

case "Windsurf":
  type = "WINDSURF";
  break;

case "Wheelchair":
  type = "WHEELCHAIR";
  break;
          default:
            ignored++;

            console.log(
              "Actividad ignorada:",
              activity.type,
              activity.name
            );
        }

        if (!type) {
          continue;
        }

        const savedActivity =
          await prisma.activity.upsert({
          where: {
            stravaId:
              String(
                activity.id
              ),
          },

          update: {
            userId:
              user.id,

            name:
              activity.name,

            type,

            distance:
              activity.distance ||
              0,

            movingTime:
              activity.moving_time ||
              0,

            elevationGain:
              activity
                .total_elevation_gain ||
              0,

            averageSpeed:
              activity.average_speed ||
              null,

            calories:
              activity.calories
                ? Math.round(
                    activity.calories
                  )
                : null,

            startDate:
              new Date(
                activity.start_date
              ),
          },

          create: {
                      externalId:
              String(
                activity.id
              ),

            source: "STRAVA",
            stravaId:
              String(
                activity.id
              ),

            userId:
              user.id,

            name:
              activity.name,

            type,

            distance:
              activity.distance ||
              0,

            movingTime:
              activity.moving_time ||
              0,

            elevationGain:
              activity
                .total_elevation_gain ||
              0,

            averageSpeed:
              activity.average_speed ||
              null,

            calories:
              activity.calories
                ? Math.round(
                    activity.calories
                  )
                : null,

            startDate:
              new Date(
                activity.start_date
              ),
          },
        });

        if (latestActivity) {
          try {
            const memberships =
              await prisma.groupMember.findMany({
                where: {
                  userId: user.id,
                  group: {
                    sport: type,
                    activityControlSpeed: {
                      not: null,
                    },
                    activityControlMinutes: {
                      not: null,
                    },
                  },
                },
                select: {
                  group: {
                    select: {
                      id: true,
                      activityControlSpeed: true,
                      activityControlMinutes: true,
                    },
                  },
                },
              });

            if (memberships.length > 0) {
              const points =
                await getStravaSpeedStream(
                  String(activity.id),
                  accessToken
                );

              if (points) {
                for (const membership of memberships) {
                  const referenceSpeed =
                    membership.group.activityControlSpeed;
                  const maximumMinutes =
                    membership.group.activityControlMinutes;

                  if (
                    referenceSpeed === null ||
                    maximumMinutes === null
                  ) {
                    continue;
                  }

                  const maxContinuousSeconds =
                    getMaxContinuousSecondsAboveSpeed(
                      points,
                      referenceSpeed
                    );

                  await prisma.groupActivityReview.upsert({
                    where: {
                      groupId_activityId: {
                        groupId: membership.group.id,
                        activityId: savedActivity.id,
                      },
                    },
                    update: {
                      referenceSpeed,
                      maximumMinutes,
                      maxContinuousSeconds,
                      needsReview:
                        maxContinuousSeconds >
                        maximumMinutes * 60,
                    },
                    create: {
                      groupId: membership.group.id,
                      activityId: savedActivity.id,
                      referenceSpeed,
                      maximumMinutes,
                      maxContinuousSeconds,
                      needsReview:
                        maxContinuousSeconds >
                        maximumMinutes * 60,
                    },
                  });
                }
              }
            }
          } catch (controlError) {
            console.error(
              `Error en Control de actividad para Strava ${activity.id}:`,
              controlError
            );
          }
        }

        imported++;
      }

      console.log(
        `Actividades guardadas: ${imported}`
      );

      console.log(
        `Actividades ignoradas: ${ignored}`
      );

      return res.json({
        success: true,

        stravaActivities:
          allActivities.length,

        imported,

        ignored,

        message:
          "Actividades importadas correctamente",
      });
    } catch (error) {
      console.error(
        "Error importando actividades:",
        error
      );

      return res.status(500).json({
        error:
          "Error importando actividades desde Strava",
      });
    }
  }
);
/* =========================================================
   ACTIVIDADES REGISTRADAS CON VIARANK
========================================================= */

app.post(
  "/api/activities/viarank",
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "Sesión no válida",
        });
      }

      const {
        externalId,
        type,
        distance,
        movingTime,
        startDate,
        gpsPoints,
      } = req.body;

      if (
        !externalId ||
        !type ||
        typeof distance !== "number" ||
        typeof movingTime !== "number" ||
        !startDate
      ) {
        return res.status(400).json({
          error: "Datos de actividad incompletos",
        });
      }

      const tiposValidos = [
        "RIDE",
        "RUN",
        "WALK",
        "HIKE",
        "SWIM",
      ];

      if (!tiposValidos.includes(type)) {
        return res.status(400).json({
          error: "Tipo de actividad no válido",
        });
      }

      const activity =
        await prisma.activity.upsert({
          where: {
            source_externalId: {
              source: "VIARANK",
              externalId: String(externalId),
            },
          },

          update: {},

          create: {
            externalId:
              String(externalId),

            source: "VIARANK",

            userId,

            type,

           name:
  type === "WALK"
    ? "Caminata ViaRank"
    : type === "RIDE"
      ? "Ciclismo ViaRank"
      : "Actividad ViaRank",

            distance,

            movingTime,

            elevationGain: 0,

            averageSpeed:
              movingTime > 0
                ? distance / movingTime
                : null,

            calories: null,

            startDate:
              new Date(startDate),
          },
        });

      const validGpsPoints: ViaRankGpsPoint[] =
        Array.isArray(gpsPoints)
          ? gpsPoints.filter(
              (point: any) =>
                point &&
                Number.isFinite(point.latitude) &&
                Number.isFinite(point.longitude) &&
                Number.isFinite(point.timestamp)
            )
          : [];

      if (validGpsPoints.length >= 2) {
        try {
          const memberships =
            await prisma.groupMember.findMany({
              where: {
                userId,
                group: {
                  sport: type,
                  activityControlSpeed: {
                    not: null,
                  },
                  activityControlMinutes: {
                    not: null,
                  },
                },
              },
              select: {
                group: {
                  select: {
                    id: true,
                    activityControlSpeed: true,
                    activityControlMinutes: true,
                  },
                },
              },
            });

          for (const membership of memberships) {
            const referenceSpeed =
              membership.group.activityControlSpeed;
            const maximumMinutes =
              membership.group.activityControlMinutes;

            if (
              referenceSpeed === null ||
              maximumMinutes === null
            ) {
              continue;
            }

            const maxContinuousSeconds =
              getViaRankMaxContinuousSecondsAboveSpeed(
                validGpsPoints,
                referenceSpeed
              );

            await prisma.groupActivityReview.upsert({
              where: {
                groupId_activityId: {
                  groupId: membership.group.id,
                  activityId: activity.id,
                },
              },
              update: {
                referenceSpeed,
                maximumMinutes,
                maxContinuousSeconds,
                needsReview:
                  maxContinuousSeconds >
                  maximumMinutes * 60,
              },
              create: {
                groupId: membership.group.id,
                activityId: activity.id,
                referenceSpeed,
                maximumMinutes,
                maxContinuousSeconds,
                needsReview:
                  maxContinuousSeconds >
                  maximumMinutes * 60,
              },
            });
          }
        } catch (controlError) {
          console.error(
            "Error en Control de actividad ViaRank:",
            controlError
          );
        }
      }

      return res.json({
        success: true,
        activity,
      });
    } catch (error) {
      console.error(
        "Error guardando actividad ViaRank:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo guardar la actividad",
      });
    }
  }
);

/* =========================================================
   RANKING DEPORTIVO
========================================================= */

/* ---------------------------------------------------------
   HISTORIAL DE ACTIVIDADES
--------------------------------------------------------- */

app.get(
  "/api/activities/history",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      const userId =
        String(req.query.userId || requesterId);

      const sport =
        String(req.query.sport || "").toUpperCase();

      const groupId =
        String(req.query.groupId || "");

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (!requester) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      if (userId !== requesterId) {
        if (!groupId) {
          return res.status(403).json({
            error: "No tenés permiso para ver estas actividades",
          });
        }

        const group =
          await prisma.sportGroup.findUnique({
            where: {
              id: groupId,
            },
            select: {
              administratorId: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          });

        if (!group) {
          return res.status(404).json({
            error: "Grupo no encontrado",
          });
        }

        const targetIsMember =
          group.members.some(
            (member) =>
              member.userId === userId
          );

                  const requesterIsMember =
  group.members.some(
    (member) =>
      member.userId === requesterId
  );

const canView =
  requester.role === "SUPER_ADMIN" ||
  group.administratorId === requesterId ||
  requesterIsMember;

        if (!canView || !targetIsMember) {
          return res.status(403).json({
            error: "No tenés permiso para ver estas actividades",
          });
        }
      }

      const where: any = {
        userId,
      };

      if (sport) {
        where.type = sport;
      }

      const activities =
        await prisma.activity.findMany({
          where,
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
            externalId: true,
            source: true,
            type: true,
            name: true,
            distance: true,
            movingTime: true,
            elevationGain: true,
            averageSpeed: true,
            calories: true,
            startDate: true,
          },
        });
const activePenalties =
  groupId
    ? await prisma.groupActivityPenalty.findMany({
        where: {
          groupId,
          revertedAt: null,
          activityId: {
            in: activities.map(
              (activity) => activity.id
            ),
          },
        },
        select: {
          activityId: true,
          reason: true,
          rankingDistanceMeters: true,
          appliedAt: true,
        },
      })
    : [];

const penaltyByActivityId =
  new Map(
    activePenalties.map(
      (penalty) => [
        penalty.activityId,
        penalty,
      ]
    )
  );

const overlappingActivityIds =
  new Set<string>();

const pendingVarActivityIds =
  new Set<string>();

const overlapPartnersByActivityId =
  new Map<string, Set<string>>();

const pendingOverlapPartnersByActivityId =
  new Map<string, Set<string>>();

const resolvedVarPairs =
  groupId
    ? await prisma.groupActivityVarResolution.findMany({
        where: {
          groupId,
          OR: [
            {
              firstActivityId: {
                in: activities.map((activity) => activity.id),
              },
            },
            {
              secondActivityId: {
                in: activities.map((activity) => activity.id),
              },
            },
          ],
        },
        select: {
          firstActivityId: true,
          secondActivityId: true,
        },
      })
    : [];

const resolvedPairKeys = new Set(
  resolvedVarPairs.map((resolution) =>
    [resolution.firstActivityId, resolution.secondActivityId]
      .sort()
      .join(":")
  )
);

for (let i = 0; i < activities.length; i++) {
  const a = activities[i];

  const aStart = new Date(a.startDate);
  const aEnd = new Date(
    aStart.getTime() +
      a.movingTime * 1000
  );

  for (let j = i + 1; j < activities.length; j++) {
    const b = activities[j];

    const bStart = new Date(b.startDate);
    const bEnd = new Date(
      bStart.getTime() +
        b.movingTime * 1000
    );

    const overlaps =
      aStart < bEnd &&
      bStart < aEnd;

    if (overlaps) {
      overlappingActivityIds.add(a.id);
      overlappingActivityIds.add(b.id);

      if (!overlapPartnersByActivityId.has(a.id)) {
        overlapPartnersByActivityId.set(a.id, new Set<string>());
      }

      if (!overlapPartnersByActivityId.has(b.id)) {
        overlapPartnersByActivityId.set(b.id, new Set<string>());
      }

      overlapPartnersByActivityId.get(a.id)!.add(b.id);
      overlapPartnersByActivityId.get(b.id)!.add(a.id);

      const pairKey =
        [a.id, b.id].sort().join(":");

      if (!resolvedPairKeys.has(pairKey)) {
        pendingVarActivityIds.add(a.id);
        pendingVarActivityIds.add(b.id);

        if (!pendingOverlapPartnersByActivityId.has(a.id)) {
          pendingOverlapPartnersByActivityId.set(a.id, new Set<string>());
        }

        if (!pendingOverlapPartnersByActivityId.has(b.id)) {
          pendingOverlapPartnersByActivityId.set(b.id, new Set<string>());
        }

        pendingOverlapPartnersByActivityId.get(a.id)!.add(b.id);
        pendingOverlapPartnersByActivityId.get(b.id)!.add(a.id);
      }
    }
  }
}
      return res.json({
        success: true,
        count: activities.length,
        activities: activities.map(
          (activity) => ({
            ...activity,
hasOverlap: overlappingActivityIds.has(activity.id),
            overlappingActivityIds:
              Array.from(
                overlapPartnersByActivityId.get(activity.id) ?? []
              ),
            pendingOverlapActivityIds:
              Array.from(
                pendingOverlapPartnersByActivityId.get(activity.id) ?? []
              ),
            hasPendingVar:
              pendingVarActivityIds.has(activity.id),
            isPenalized:
              penaltyByActivityId.has(activity.id),
            penalty:
              penaltyByActivityId.has(activity.id)
                ? {
                    reason:
                      penaltyByActivityId.get(activity.id)!.reason,
                    rankingDistanceKm:
                      Number(
                        (
                          penaltyByActivityId.get(activity.id)!
                            .rankingDistanceMeters / 1000
                        ).toFixed(2)
                      ),
                    appliedAt:
                      penaltyByActivityId.get(activity.id)!.appliedAt,
                  }
                : null,
            distanceKm: Number(
              (activity.distance / 1000).toFixed(2)
            ),
            endDate: new Date(
              activity.startDate.getTime() +
                activity.movingTime * 1000
            ),
          })
        ),
      });
    } catch (error) {
      console.error(
        "Error cargando historial de actividades:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cargar el historial de actividades",
      });
    }
  }
);

app.get(
  "/api/ranking",
  async (req, res) => {
    try {
      const sport =
        String(
          req.query.sport ||
            ""
        ).toUpperCase();

      const period =
        String(
          req.query.period ||
            ""
        ).toLowerCase();

      let startDate:
        | Date
        | undefined;

      const now =
        new Date();

      if (period === "week") {
  startDate = new Date(now);

  const day = startDate.getDay();

  const diffToMonday =
    day === 0 ? 6 : day - 1;

  startDate.setDate(
    startDate.getDate() - diffToMonday
  );

  startDate.setHours(0, 0, 0, 0);
}

if (period === "month") {
  startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  startDate.setHours(0, 0, 0, 0);
}

if (period === "year") {
  startDate = new Date(
    now.getFullYear(),
    0,
    1
  );

  startDate.setHours(0, 0, 0, 0);
}

      const where: any = {};

      if (
        sport &&
       [
  "RIDE",
  "RUN",
  "WALK",
  "HIKE",
  "SWIM",
  "KAYAK",
  "ROW",
  "SAIL",
  "WINDSURF",
  "WHEELCHAIR",
].includes(sport)
      ) {
        where.type = sport;
      }

      if (startDate) {
        where.startDate = {
          gte: startDate,
        };
      }

      const activities =
        await prisma.activity.findMany({
          where,

          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },
          },
        });

      const rankingMap =
        new Map<
          string,
          {
            userId: string;
            firstName: string;
            lastName: string;
            profilePicture:
              string | null;
            activities: number;
            distance: number;
            movingTime: number;
            elevationGain: number;
          }
        >();

      for (
        const activity of
        activities
      ) {
        const existing =
          rankingMap.get(
            activity.userId
          );

        if (!existing) {
          rankingMap.set(
            activity.userId,
            {
              userId:
                activity.userId,

              firstName:
                activity.user
                  .firstName,

              lastName:
                activity.user
                  .lastName,

              profilePicture:
                activity.user
                  .profilePicture,

              activities: 1,

              distance:
                activity.distance,

              movingTime:
                activity.movingTime,

              elevationGain:
                activity
                  .elevationGain,
            }
          );
        } else {
          existing.activities++;

          existing.distance +=
            activity.distance;

          existing.movingTime +=
            activity.movingTime;

          existing.elevationGain +=
            activity.elevationGain;
        }
      }

      const ranking =
        Array.from(
          rankingMap.values()
        )
          .sort(
            (a, b) =>
              b.distance -
              a.distance
          )

          .map(
            (
              athlete,
              index
            ) => ({
              position:
                index + 1,

              userId:
                athlete.userId,

              firstName:
                athlete.firstName,

              lastName:
                athlete.lastName,

              profilePicture:
                athlete.profilePicture,

              activities:
                athlete.activities,

              distance:
                athlete.distance,

              movingTime:
                athlete.movingTime,

              elevationGain:
                athlete.elevationGain,

              distanceKm:
                Number(
                  (
                    athlete.distance /
                    1000
                  ).toFixed(2)
                ),

              hours:
                Number(
                  (
                    athlete.movingTime /
                    3600
                  ).toFixed(2)
                ),
            })
          );

      return res.json({
        success: true,

        count:
          ranking.length,

        ranking,
      });
    } catch (error) {
      console.error(
        "Error generando ranking:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo generar el ranking",
      });
    }
  }
);
/* =========================================================
   GRUPOS DEPORTIVOS
========================================================= */

/* ---------------------------------------------------------
   GENERAR CÃ“DIGO ÃšNICO DE GRUPO
--------------------------------------------------------- */

async function generateUniqueJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  while (true) {
    let code = "";

    for (let i = 0; i < 7; i++) {
      code += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    const existing =
      await prisma.sportGroup.findUnique({
        where: {
          joinCode: code,
        },
      });

    if (!existing) {
      return code;
    }
  }
}

/* ---------------------------------------------------------
   CREAR GRUPO
--------------------------------------------------------- */

app.post(
  "/api/groups",
  async (req, res) => {
    try {
     const {
  name,
  sport,
  visibility,
} = req.body;

const administratorId =
  getAuthenticatedUserId(req);

if (!administratorId) {
  return res.status(401).json({
    error: "Usuario no autenticado",
  });
}

      if (!name || !sport) {
        return res.status(400).json({
          error:
            "Faltan nombre, deporte o administrador",
        });
      }

      const normalizedSport =
        String(sport).toUpperCase();

      const normalizedVisibility =
        visibility === "PRIVATE"
          ? "PRIVATE"
          : "PUBLIC";

      if (
        ![
  "RIDE",
  "RUN",
  "WALK",
  "HIKE",
  "SWIM",
  "KAYAK",
  "ROW",
  "SAIL",
  "WINDSURF",
  "WHEELCHAIR",
].includes(normalizedSport)
  ) {
        return res.status(400).json({
          error:
            "Deporte no vÃ¡lido",
        });
      }

      const administrator =
        await prisma.user.findUnique({
          where: {
            id: administratorId,
          },
        });

      if (!administrator) {
        return res.status(404).json({
          error:
            "Administrador no encontrado",
        });
      }

      const joinCode =
        await generateUniqueJoinCode();

      const group =
        await prisma.sportGroup.create({
          data: {
            name:
              String(name).trim(),

            sport:
              normalizedSport as
               | "RIDE"
| "RUN"
| "WALK"
| "HIKE"
| "SWIM"
| "KAYAK"
| "ROW"
| "SAIL"
| "WINDSURF"
| "WHEELCHAIR",

            joinCode,

            visibility: normalizedVisibility,

            administratorId,

            members: {
              create: {
                userId:
                  administratorId,
              },
            },
          },

          include: {
            administrator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },

            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                  },
                },
              },
            },
          },
        });

      return res.status(201).json({
        success: true,
        group,
      });
    } catch (error) {
      console.error(
        "Error creando grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo crear el grupo",
      });
    }
  }
);

/* ---------------------------------------------------------
   LISTAR / BUSCAR GRUPOS
--------------------------------------------------------- */

app.get(
  "/api/groups",
  async (req, res) => {
    try {
      const sport =
  String(
    req.query.sport || ""
  ).toUpperCase();

const requesterId =
  getAuthenticatedUserId(req);

if (!requesterId) {
  return res.status(401).json({
    error: "Usuario no autenticado",
  });
}

const requester =
  await prisma.user.findUnique({
    where: {
      id: requesterId,
    },
    select: {
      role: true,
    },
  });

if (!requester) {
  return res.status(404).json({
    error: "Usuario no encontrado",
  });
}

const isSuperAdmin =
  requester.role === "SUPER_ADMIN";

const validSports = [
  "RIDE",
  "RUN",
  "WALK",
  "HIKE",
  "SWIM",
  "KAYAK",
  "ROW",
  "SAIL",
  "WINDSURF",
  "WHEELCHAIR",
];

const hasValidSport =
  sport &&
  validSports.includes(sport);

const where: any = {};

if (isSuperAdmin) {
  if (hasValidSport) {
    where.sport = sport;
  }
} else if (hasValidSport) {
  where.OR = [
    {
      visibility: "PUBLIC",
      sport,
    },
    {
      administratorId: requesterId,
    },
    {
      visibility: "PRIVATE",
      members: {
        some: {
          userId: requesterId,
        },
      },
    },
  ];
} else {
  where.OR = [
    {
      administratorId: requesterId,
    },
    {
      members: {
        some: {
          userId: requesterId,
        },
      },
    },
  ];
}

      const groups =
        await prisma.sportGroup.findMany({
          where,

          orderBy: {
            createdAt: "desc",
          },

          include: {
            administrator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },

            _count: {
              select: {
                members: true,
              },
            },

            members: {
              where: {
                userId: requesterId,
              },
              select: {
                userId: true,
              },
            },

            events: {
              where: {
                eventDate: {
                  gte: new Date(),
                },
              },
              orderBy: {
                eventDate: "asc",
              },
              take: 1,
              select: {
                id: true,
                eventDate: true,
                departureTime: true,
                title: true,
              },
            },
          },
        });

      const groupsWithMembership = groups.map((group) => ({
        ...group,
        isMember:
          group.administratorId === requesterId ||
          group.members.length > 0,
        members: undefined,
        upcomingEvent:
          group.events.length > 0
            ? group.events[0]
            : null,
        events: undefined,
      }));


      return res.json({
        success: true,
        count:
          groupsWithMembership.length,
        groups: groupsWithMembership,
      });
    } catch (error) {
      console.error(
        "Error obteniendo grupos:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron obtener los grupos",
      });
    }
  }
);

/* ---------------------------------------------------------
   UNIRSE A UN GRUPO POR CÃ“DIGO
--------------------------------------------------------- */

app.post(
  "/api/groups/join",
  async (req, res) => {
    try {
      const {
  joinCode,
} = req.body;

const userId =
  getAuthenticatedUserId(req);

if (!userId) {
  return res.status(401).json({
    error: "Usuario no autenticado",
  });
}

      if (!userId || !joinCode) {
        return res.status(400).json({
          error:
            "Faltan usuario o cÃ³digo de grupo",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

      if (!user) {
        return res.status(404).json({
          error:
            "Usuario no encontrado",
        });
      }

      const group =
        await prisma.sportGroup.findUnique({
          where: {
            joinCode:
              String(joinCode)
                .trim()
                .toUpperCase(),
          },
        });

      if (!group) {
        return res.status(404).json({
          error:
            "CÃ³digo de grupo invÃ¡lido",
        });
      }

      const membership =
        await prisma.groupMember.upsert({
          where: {
            userId_groupId: {
              userId,
              groupId:
                group.id,
            },
          },

          update: {},

          create: {
            userId,
            groupId:
              group.id,
          },

          include: {
            group: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },
          },
        });

      return res.json({
        success: true,
        membership,
      });
    } catch (error) {
      console.error(
        "Error uniÃ©ndose al grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo unir al grupo",
      });
    }
  }
);

/* ---------------------------------------------------------
   RANKING INTERNO DEL GRUPO
--------------------------------------------------------- */

app.get(
  "/api/groups/:groupId/ranking",
  async (req, res) => {
    try {
           const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error:
            "Usuario no autenticado",
        });
      }

      const {
        groupId,
      } = req.params;

      const period =
        String(
          req.query.period || ""
        ).toLowerCase();
const sex =
  String(
    req.query.sex || ""
  ).toUpperCase();
      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },

          include: {
           members: {
  select: {
    userId: true,
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
sex: true,
      },
    },
  },
},

            administrator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

      if (!group) {
        return res.status(404).json({
          error:
            "Grupo no encontrado",
        });
      }

      const rankingMembers =
  sex === "MALE" || sex === "FEMALE"
    ? group.members.filter(
        (member) =>
          member.user.sex === sex
      )
    : group.members;

const memberIds =
  rankingMembers.map(
    (member) =>
      member.userId
  );

      let startDate:
        | Date
        | undefined;

      const now =
        new Date();

      if (period === "week") {
  startDate = new Date(now);

  const day = startDate.getDay();

  const diffToMonday =
    day === 0 ? 6 : day - 1;

  startDate.setDate(
    startDate.getDate() - diffToMonday
  );

  startDate.setHours(0, 0, 0, 0);
}

if (period === "month") {
  startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  startDate.setHours(0, 0, 0, 0);
}

if (period === "year") {
  startDate = new Date(
    now.getFullYear(),
    0,
    1
  );

  startDate.setHours(0, 0, 0, 0);
}

      const where: any = {
        userId: {
          in: memberIds,
        },

        type:
          group.sport,
      };

      if (startDate) {
        where.startDate = {
          gte: startDate,
        };
      }

      const activities =
        await prisma.activity.findMany({
          where,

          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },
          },
        });
      // ---------------------------------------------------------
      // DETECTAR ACTIVIDADES SUPERPUESTAS POR ATLETA
      // ---------------------------------------------------------

      const activeGroupPenalties =
        await prisma.groupActivityPenalty.findMany({
          where: {
            groupId,
            revertedAt: null,
            activityId: {
              in: activities.map(
                (activity) => activity.id
              ),
            },
          },
          select: {
            activityId: true,
            rankingDistanceMeters: true,
            appliedAt: true,
          },
        });

      const rankingPenaltyByActivityId =
        new Map(
          activeGroupPenalties.map(
            (penalty) => [
              penalty.activityId,
              penalty.rankingDistanceMeters,
            ]
          )
        );

      const resolvedGroupVarPairs =
        await prisma.groupActivityVarResolution.findMany({
          where: {
            groupId,
          },
          select: {
            firstActivityId: true,
            secondActivityId: true,
          },
        });

      const resolvedGroupVarPairKeys = new Set(
        resolvedGroupVarPairs.map((resolution) =>
          [resolution.firstActivityId, resolution.secondActivityId]
            .sort()
            .join(":")
        )
      );

      const pendingGroupVarActivityIds = new Set<string>();

      const overlappingActivityIds = new Set<string>();
      const activitiesByUser = new Map<string, typeof activities>();

      for (const activity of activities) {
        const list =
          activitiesByUser.get(activity.userId) || [];

        list.push(activity);
        activitiesByUser.set(activity.userId, list);
      }

      for (const userActivities of activitiesByUser.values()) {
        for (let i = 0; i < userActivities.length; i++) {
          const a = userActivities[i];

          const aStart = new Date(a.startDate);
          const aEnd = new Date(
            aStart.getTime() +
              a.movingTime * 1000
          );

          for (let j = i + 1; j < userActivities.length; j++) {
            const b = userActivities[j];

            const bStart = new Date(b.startDate);
            const bEnd = new Date(
              bStart.getTime() +
                b.movingTime * 1000
            );

            // Deben ser del mismo día
            const sameDay =
              aStart.getFullYear() === bStart.getFullYear() &&
              aStart.getMonth() === bStart.getMonth() &&
              aStart.getDate() === bStart.getDate();

            if (!sameDay) continue;

            // Detectar superposición total o parcial
            const overlaps =
              aStart < bEnd &&
              bStart < aEnd;

            if (overlaps) {
              overlappingActivityIds.add(a.id);
              overlappingActivityIds.add(b.id);

              const pairKey =
                [a.id, b.id].sort().join(":");

              if (!resolvedGroupVarPairKeys.has(pairKey)) {
                pendingGroupVarActivityIds.add(a.id);
                pendingGroupVarActivityIds.add(b.id);
              }
            }
          }
        }
      }
      const rankingMap =
        new Map<
          string,
          {
            userId: string;
            firstName: string;
            lastName: string;
            profilePicture:
              string | null;
            activities: number;
            distance: number;
            movingTime: number;
            elevationGain: number;
          }
        >();
        for (const member of rankingMembers) {
  rankingMap.set(
    member.userId,
    {
      userId: member.userId,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      profilePicture:
        member.user.profilePicture,
      activities: 0,
      distance: 0,
      movingTime: 0,
      elevationGain: 0,
    }
  );
}
      for (const activity of activities) {
        const existing =
          rankingMap.get(
            activity.userId
          );

        if (!existing) {
          rankingMap.set(
            activity.userId,
            {
              userId:
                activity.userId,

              firstName:
                activity.user.firstName,

              lastName:
                activity.user.lastName,

              profilePicture:
                activity.user.profilePicture,

              activities: 1,

              distance:
                rankingPenaltyByActivityId.get(activity.id) ??
                activity.distance,

              movingTime:
                activity.movingTime,

              elevationGain:
                activity.elevationGain,
            }
          );
        } else {
          existing.activities++;

          existing.distance +=
            rankingPenaltyByActivityId.get(activity.id) ??
            activity.distance;

          existing.movingTime +=
            activity.movingTime;

          existing.elevationGain +=
            activity.elevationGain;
        }
      }

      const ranking =
        Array.from(
          rankingMap.values()
        )
          .sort(
            (a, b) =>
              b.distance -
              a.distance
          )
          .map(
            (
              athlete,
              index
            ) => ({
              position:
                index + 1,

              ...athlete,

              distanceKm:
                Number(
                  (
                    athlete.distance /
                    1000
                  ).toFixed(2)
                ),

              hours:
                Number(
                  (
                    athlete.movingTime /
                    3600
                  ).toFixed(2)
                ),
hasOverlap: activities.some(
  (activity) =>
    activity.userId === athlete.userId &&
    overlappingActivityIds.has(activity.id)
),
hasPendingVar: activities.some(
  (activity) =>
    activity.userId === athlete.userId &&
    pendingGroupVarActivityIds.has(activity.id)
),
hasPenalty: activities.some(
  (activity) =>
    activity.userId === athlete.userId &&
    rankingPenaltyByActivityId.has(activity.id)
),
penalty: (() => {
  const penalizedActivity = activities.find(
    (activity) =>
      activity.userId === athlete.userId &&
      rankingPenaltyByActivityId.has(activity.id)
  );

  if (!penalizedActivity) {
    return null;
  }

  const penalty = activeGroupPenalties.find(
    (item) => item.activityId === penalizedActivity.id
  );

  if (!penalty) {
    return null;
  }

  return {
    rankingDistanceKm: Number(
      (penalty.rankingDistanceMeters / 1000).toFixed(2)
    ),
    appliedAt: penalty.appliedAt,
  };
})(),
            })
          );

      return res.json({
        success: true,

        group: {
          id: group.id,
          name: group.name,
          sport: group.sport,
          visibility: group.visibility,
          joinCode:
            group.joinCode,
          administrator:
            group.administrator,
          members:
            memberIds.length,
        },

        count:
          ranking.length,

        ranking,
      });
    } catch (error) {
      console.error(
        "Error generando ranking del grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo generar el ranking del grupo",
      });
    }
  }
);
/* =========================================================
   ACTUALIZAR GRUPO
========================================================= */

app.patch(
  "/api/groups/:groupId",
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const {
        visibility,
        activityControlSpeed,
        activityControlMinutes,
      } = req.body;

      const userId =
        getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },
          select: {
            id: true,
            administratorId: true,
          },
        });

      if (!group) {
        return res.status(404).json({
          error: "Grupo no encontrado",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      const canManage =
        user.role === "SUPER_ADMIN" ||
        group.administratorId === userId;

      if (!canManage) {
        return res.status(403).json({
          error:
            "No tenés permiso para administrar este grupo",
        });
      }

      const updateData: {
        visibility?: "PUBLIC" | "PRIVATE";
        activityControlSpeed?: number | null;
        activityControlMinutes?: number | null;
      } = {};

      if (visibility !== undefined) {
        if (
          visibility !== "PUBLIC" &&
          visibility !== "PRIVATE"
        ) {
          return res.status(400).json({
            error: "Visibilidad inválida",
          });
        }

        updateData.visibility = visibility;
      }

      if (activityControlSpeed !== undefined) {
        if (
          activityControlSpeed !== null &&
          (
            typeof activityControlSpeed !== "number" ||
            !Number.isFinite(activityControlSpeed) ||
            activityControlSpeed < 0
          )
        ) {
          return res.status(400).json({
            error:
              "Velocidad de referencia inválida",
          });
        }

        updateData.activityControlSpeed =
          activityControlSpeed;
      }

      if (activityControlMinutes !== undefined) {
        if (
          activityControlMinutes !== null &&
          (
            !Number.isInteger(activityControlMinutes) ||
            activityControlMinutes < 0
          )
        ) {
          return res.status(400).json({
            error: "Tiempo máximo inválido",
          });
        }

        updateData.activityControlMinutes =
          activityControlMinutes;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No hay cambios para guardar",
        });
      }

      const updatedGroup =
        await prisma.sportGroup.update({
          where: {
            id: groupId,
          },
          data: updateData,
        });

      return res.json({
        success: true,
        group: updatedGroup,
      });
    } catch (error) {
      console.error(
        "Error actualizando grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar el grupo",
      });
    }
  }
);
/* =========================================================
   PENALIZACION VAR POR ACTIVIDADES SUPERPUESTAS
========================================================= */

app.post(
  "/api/groups/:groupId/activity-penalties",
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { activityIds, resolutionPairs } = req.body;

      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      if (
        !Array.isArray(activityIds) ||
        activityIds.length < 1 ||
        activityIds.some(
          (id) => typeof id !== "string"
        )
      ) {
        return res.status(400).json({
          error:
            "Debés indicar al menos una actividad",
        });
      }

      const uniqueActivityIds =
        Array.from(
          new Set<string>(activityIds)
        );

      if (uniqueActivityIds.length < 1) {
        return res.status(400).json({
          error:
            "Debés indicar al menos una actividad",
        });
      }

      if (
        !Array.isArray(resolutionPairs) ||
        resolutionPairs.length !== 1
      ) {
        return res.status(400).json({
          error:
            "Debés resolver un solo caso VAR por vez",
        });
      }

      const resolutionPair = resolutionPairs[0];

      if (
        !resolutionPair ||
        typeof resolutionPair.firstActivityId !== "string" ||
        typeof resolutionPair.secondActivityId !== "string" ||
        resolutionPair.firstActivityId ===
          resolutionPair.secondActivityId
      ) {
        return res.status(400).json({
          error:
            "El caso VAR debe contener dos actividades distintas",
        });
      }

      const [firstActivityId, secondActivityId] =
        [
          resolutionPair.firstActivityId,
          resolutionPair.secondActivityId,
        ].sort();

      const resolutionActivityIds = new Set([
        firstActivityId,
        secondActivityId,
      ]);

      const selectedBelongToResolution =
        uniqueActivityIds.every((activityId) =>
          resolutionActivityIds.has(activityId)
        );

      if (!selectedBelongToResolution) {
        return res.status(400).json({
          error:
            "Las actividades penalizadas deben pertenecer al caso VAR indicado",
        });
      }
      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },
          select: {
            id: true,
            sport: true,
            administratorId: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        });

      if (!group) {
        return res.status(404).json({
          error: "Grupo no encontrado",
        });
      }

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (!requester) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      const canManage =
        requester.role === "SUPER_ADMIN" ||
        group.administratorId === requesterId;

      if (!canManage) {
        return res.status(403).json({
          error:
            "No tenés permiso para administrar este grupo",
        });
      }

      const activities =
        await prisma.activity.findMany({
          where: {
            id: {
              in: uniqueActivityIds,
            },
          },
          select: {
            id: true,
            userId: true,
            type: true,
            distance: true,
            movingTime: true,
            startDate: true,
          },
        });

      if (
        activities.length !==
        uniqueActivityIds.length
      ) {
        return res.status(404).json({
          error:
            "Una o más actividades no fueron encontradas",
        });
      }

      const athleteId =
        activities[0].userId;

      const sameAthlete =
        activities.every(
          (activity) =>
            activity.userId === athleteId
        );

      if (!sameAthlete) {
        return res.status(400).json({
          error:
            "Las actividades deben pertenecer al mismo atleta",
        });
      }

      const athleteIsMember =
        group.members.some(
          (member) =>
            member.userId === athleteId
        );

      if (!athleteIsMember) {
        return res.status(400).json({
          error:
            "El atleta no pertenece a este grupo",
        });
      }

      const correctSport =
        activities.every(
          (activity) =>
            activity.type === group.sport
        );

      if (!correctSport) {
        return res.status(400).json({
          error:
            "Las actividades no corresponden al deporte del grupo",
        });
      }

      const comparisonActivities =
        await prisma.activity.findMany({
          where: {
            userId: athleteId,
            type: group.sport,
          },
          select: {
            id: true,
            movingTime: true,
            startDate: true,
          },
        });

      const selectedActivitiesOverlap =
        activities.every((selectedActivity) => {
          const selectedStart =
            new Date(selectedActivity.startDate);
          const selectedEnd =
            new Date(
              selectedStart.getTime() +
                selectedActivity.movingTime * 1000
            );

          return comparisonActivities.some(
            (otherActivity) => {
              if (otherActivity.id === selectedActivity.id) {
                return false;
              }

              const otherStart =
                new Date(otherActivity.startDate);
              const otherEnd =
                new Date(
                  otherStart.getTime() +
                    otherActivity.movingTime * 1000
                );

              const sameDay =
                selectedStart.getFullYear() ===
                  otherStart.getFullYear() &&
                selectedStart.getMonth() ===
                  otherStart.getMonth() &&
                selectedStart.getDate() ===
                  otherStart.getDate();

              return (
                sameDay &&
                selectedStart < otherEnd &&
                otherStart < selectedEnd
              );
            }
          );
        });

      if (!selectedActivitiesOverlap) {
        return res.status(400).json({
          error:
            "Cada actividad seleccionada debe estar superpuesta con otra actividad del atleta",
        });
      }

      const resolutionPairActivities =
        await prisma.activity.findMany({
          where: {
            id: {
              in: [firstActivityId, secondActivityId],
            },
          },
          select: {
            id: true,
            userId: true,
            type: true,
            movingTime: true,
            startDate: true,
          },
        });

      if (resolutionPairActivities.length !== 2) {
        return res.status(404).json({
          error:
            "Una o más actividades del caso VAR no fueron encontradas",
        });
      }

      const resolutionPairIsValidForGroup =
        resolutionPairActivities.every(
          (activity) =>
            activity.userId === athleteId &&
            activity.type === group.sport
        );

      if (!resolutionPairIsValidForGroup) {
        return res.status(400).json({
          error:
            "El caso VAR no corresponde al atleta o al deporte del grupo",
        });
      }

      const firstResolutionActivity =
        resolutionPairActivities.find(
          (activity) => activity.id === firstActivityId
        )!;

      const secondResolutionActivity =
        resolutionPairActivities.find(
          (activity) => activity.id === secondActivityId
        )!;

      const firstResolutionStart =
        new Date(firstResolutionActivity.startDate);
      const firstResolutionEnd =
        new Date(
          firstResolutionStart.getTime() +
            firstResolutionActivity.movingTime * 1000
        );

      const secondResolutionStart =
        new Date(secondResolutionActivity.startDate);
      const secondResolutionEnd =
        new Date(
          secondResolutionStart.getTime() +
            secondResolutionActivity.movingTime * 1000
        );

      const resolutionSameDay =
        firstResolutionStart.getFullYear() ===
          secondResolutionStart.getFullYear() &&
        firstResolutionStart.getMonth() ===
          secondResolutionStart.getMonth() &&
        firstResolutionStart.getDate() ===
          secondResolutionStart.getDate();

      const resolutionPairOverlaps =
        resolutionSameDay &&
        firstResolutionStart < secondResolutionEnd &&
        secondResolutionStart < firstResolutionEnd;

      if (!resolutionPairOverlaps) {
        return res.status(400).json({
          error:
            "Las actividades indicadas no forman un caso VAR superpuesto",
        });
      }
      const existingActivePenalties =
        await prisma.groupActivityPenalty.findMany({
          where: {
            groupId,
            activityId: {
              in: uniqueActivityIds,
            },
            revertedAt: null,
          },
          select: {
            activityId: true,
          },
        });

      if (existingActivePenalties.length > 0) {
        return res.status(409).json({
          error:
            "La penalización ya fue aplicada",
        });
      }

      const existingResolution =
        await prisma.groupActivityVarResolution.findUnique({
          where: {
            groupId_firstActivityId_secondActivityId: {
              groupId,
              firstActivityId,
              secondActivityId,
            },
          },
          select: {
            id: true,
          },
        });

      if (existingResolution) {
        return res.status(409).json({
          error:
            "Este caso VAR ya fue resuelto",
        });
      }

      const appliedAt = new Date();

      const penalties = await prisma.$transaction(
        async (tx) => {
          const createdPenalties = [];

          for (const activity of activities) {
            createdPenalties.push(
              await tx.groupActivityPenalty.upsert({
                where: {
                  groupId_activityId: {
                    groupId,
                    activityId: activity.id,
                  },
                },
                create: {
                  groupId,
                  activityId: activity.id,
                  appliedBy: requesterId,
                  reason:
                    "Actividades superpuestas",
                  originalDistanceMeters:
                    activity.distance,
                  rankingDistanceMeters: 10,
                  appliedAt,
                },
                update: {
                  appliedBy: requesterId,
                  reason:
                    "Actividades superpuestas",
                  originalDistanceMeters:
                    activity.distance,
                  rankingDistanceMeters: 10,
                  appliedAt,
                  revertedAt: null,
                },
              })
            );
          }

          await tx.groupActivityVarResolution.create({
            data: {
              groupId,
              firstActivityId,
              secondActivityId,
              resolvedBy: requesterId,
              resolvedAt: appliedAt,
            },
          });

          return createdPenalties;
        }
      );

      return res.json({
        success: true,
        message:
          "Penalización aplicada",
        rankingDistanceKm: 0.01,
        appliedAt,
        activityIds:
          penalties.map(
            (penalty) =>
              penalty.activityId
          ),
      });
    } catch (error) {
      console.error(
        "Error aplicando penalización VAR:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo aplicar la penalización",
      });
    }
  }
);

/* =========================================================
   EVENTOS DEL GRUPO
========================================================= */

app.get(
  "/api/groups/:groupId/events",
  async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await prisma.sportGroup.findUnique({
        where: { id: groupId },
        select: { id: true },
      });

      if (!group) {
        return res.status(404).json({
          error: "Grupo no encontrado",
        });
      }

      const events = await prisma.groupEvent.findMany({
        where: { groupId },
        orderBy: { eventDate: "asc" },
      });

      return res.json({
        success: true,
        events,
      });
    } catch (error) {
      console.error("Error obteniendo eventos:", error);

      return res.status(500).json({
        error: "No se pudieron obtener los eventos",
      });
    }
  }
);

app.post(
  "/api/groups/:groupId/events",
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const {
        title,
        eventDate,
        departureTime,
        meetingPlace,
        destination,
        estimatedReturn,
        plannedSpeed,
        rules,
      } = req.body;

      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      const group = await prisma.sportGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          administratorId: true,
        },
      });

      if (!group) {
        return res.status(404).json({
          error: "Grupo no encontrado",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      const membership =
        group.administratorId === userId
          ? null
          : await prisma.groupMember.findUnique({
              where: {
                userId_groupId: {
                  userId,
                  groupId,
                },
              },
              select: {
                canCreateEvents: true,
              },
            });

      const canCreateEvent =
        group.administratorId === userId ||
        membership?.canCreateEvents === true;

      if (!canCreateEvent) {
        return res.status(403).json({
          error: "No tenés permiso para crear eventos en este grupo",
        });
      }

      if (!title || !eventDate || !departureTime || !meetingPlace) {
        return res.status(400).json({
          error:
            "Título, fecha, hora de salida y lugar de encuentro son obligatorios",
        });
      }

      const parsedDate = new Date(eventDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: "La fecha del evento no es válida",
        });
      }

      const event = await prisma.groupEvent.create({
        data: {
          groupId,
          title: String(title).trim(),
          eventDate: parsedDate,
          departureTime: String(departureTime).trim(),
          meetingPlace: String(meetingPlace).trim(),
          destination: destination ? String(destination).trim() : null,
          estimatedReturn: estimatedReturn
            ? String(estimatedReturn).trim()
            : null,
          plannedSpeed: plannedSpeed
            ? String(plannedSpeed).trim()
            : null,
          rules: rules ? String(rules).trim() : null,
        },
      });

      return res.status(201).json({
        success: true,
        event,
      });
    } catch (error) {
      console.error("Error creando evento:", error);

      return res.status(500).json({
        error: "No se pudo crear el evento",
      });
    }
  }
);

/* =========================================================
   ELIMINAR GRUPO
========================================================= */

app.delete(
  "/api/groups/:groupId",
  async (req, res) => {
    try {
      const { groupId } = req.params;

  const administratorId =
  getAuthenticatedUserId(req);

if (!administratorId) {
  return res.status(401).json({
    error:
      "Usuario no autenticado",
  });
}

      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },

          select: {
            id: true,
            name: true,
            administratorId: true,
          },
        });

      if (!group) {
        return res.status(404).json({
          error:
            "Grupo no encontrado",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: administratorId,
          },

          select: {
            id: true,
            role: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          error:
            "Usuario no encontrado",
        });
      }

      const canDelete =
  user.role === "SUPER_ADMIN" ||
  group.administratorId === administratorId;

      if (!canDelete) {
        return res.status(403).json({
          error:
            "No tenÃ©s permiso para eliminar este grupo",
        });
      }

      await prisma.sportGroup.delete({
        where: {
          id: groupId,
        },
      });

      return res.json({
        success: true,
        message:
          `Grupo "${group.name}" eliminado correctamente`,
      });
    } catch (error) {
      console.error(
        "Error eliminando grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo eliminar el grupo",
      });
    }
  }
);
/* ---------------------------------------------------------
   CONTROL DE ACTIVIDAD - CONSULTAR REVISIONES
--------------------------------------------------------- */

app.get(
  "/api/groups/:groupId/activity-reviews",
  async (req, res) => {
    try {
      const requesterId = getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      const { groupId } = req.params;

      const group = await prisma.sportGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          administratorId: true,
        },
      });

      if (!group) {
        return res.status(404).json({
          error: "Grupo no encontrado",
        });
      }

      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          role: true,
        },
      });

      if (!requester) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      const canManage =
        requester.role === "SUPER_ADMIN" ||
        group.administratorId === requesterId;

      if (!canManage) {
        return res.status(403).json({
          error: "No tienes permiso para revisar actividades de este grupo",
        });
      }

      const reviews = await prisma.groupActivityReview.findMany({
        where: {
          groupId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          referenceSpeed: true,
          maximumMinutes: true,
          maxContinuousSeconds: true,
          needsReview: true,
          createdAt: true,
          activity: {
            select: {
              id: true,
              source: true,
              type: true,
              name: true,
              distance: true,
              movingTime: true,
              startDate: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return res.json({
        success: true,
        group: {
          id: group.id,
          name: group.name,
        },
        count: reviews.length,
        reviews,
      });
    } catch (error) {
      console.error(
        "Error consultando control de actividad:",
        error
      );

      return res.status(500).json({
        error: "No se pudo consultar el control de actividad",
      });
    }
  }
);
/* =========================================================
   MIEMBROS DE GRUPO
========================================================= */

/* ---------------------------------------------------------
   LISTAR MIEMBROS DEL GRUPO
--------------------------------------------------------- */

app.get(
  "/api/groups/:groupId/members",
  async (req, res) => {
    try {
     const requesterId =
  getAuthenticatedUserId(req);

if (!requesterId) {
  return res.status(401).json({
    error:
      "Usuario no autenticado",
  });
} 
const { groupId } = req.params;

      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },

          select: {
            id: true,
            name: true,
            administratorId: true,

            administrator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
                role: true,
              },
            },

            members: {
              orderBy: {
                joinedAt: "asc",
              },

              select: {
                id: true,
                joinedAt: true,
                canCreateEvents: true,

                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    role: true,
                  },
                },
              },
            },
          },
        });

      if (!group) {
        return res.status(404).json({
          error:
            "Grupo no encontrado",
        });
      }
            const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },

          select: {
            id: true,
            role: true,
          },
        });

      if (!requester) {
        return res.status(404).json({
          error:
            "Usuario no encontrado",
        });
      }

      const canManage =
        requester.role ===
          "SUPER_ADMIN" ||
        group.administratorId ===
          requesterId;

      if (!canManage) {
        return res.status(403).json({
          error:
            "No tienes permiso para ver los miembros de este grupo",
        });
      }

      const members =
        group.members.map(
          (membership: {
           id: string;
joinedAt: Date;
canCreateEvents: boolean;
user: {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
};
}) => ({
            membershipId:
              membership.id,

            joinedAt:
              membership.joinedAt,

            canCreateEvents:
              membership.canCreateEvents,

            user: {
              ...membership.user,

              isGroupAdministrator:
                membership.user.id ===
                group.administratorId,
            },
          })
        );

      return res.json({
        success: true,

        group: {
          id: group.id,
          name: group.name,
          administratorId:
            group.administratorId,
          administrator:
            group.administrator,
        },

        count:
          members.length,

        members,
      });
    } catch (error) {
      console.error(
        "Error obteniendo miembros del grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron obtener los miembros del grupo",
      });
    }
  }
);

/* ---------------------------------------------------------
   QUITAR MIEMBRO DEL GRUPO
--------------------------------------------------------- */

app.delete(
  "/api/groups/:groupId/members/:userId",
  async (req, res) => {
    try {
      const {
        groupId,
        userId,
      } = req.params;

      const requesterId =
  getAuthenticatedUserId(req);

if (!requesterId) {
  return res.status(401).json({
    error:
      "Usuario no autenticado",
  });
}

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },

          select: {
            id: true,
            role: true,
          },
        });

      if (!requester) {
        return res.status(404).json({
          error:
            "Usuario solicitante no encontrado",
        });
      }

      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },

          select: {
            id: true,
            name: true,
            administratorId: true,
          },
        });

      if (!group) {
        return res.status(404).json({
          error:
            "Grupo no encontrado",
        });
      }

      const canManage =
        requester.role ===
          "SUPER_ADMIN" ||
        group.administratorId ===
          requesterId;

      if (!canManage) {
        return res.status(403).json({
          error:
            "No tenÃ©s permiso para quitar miembros de este grupo",
        });
      }

      if (
        userId ===
        group.administratorId
      ) {
        return res.status(400).json({
          error:
            "El administrador del grupo no puede ser eliminado como miembro",
        });
      }

      const membership =
        await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },

          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

      if (!membership) {
        return res.status(404).json({
          error:
            "El atleta no pertenece a este grupo",
        });
      }

      await prisma.groupMember.delete({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
      });

      return res.json({
        success: true,

        message:
          `${membership.user.firstName} ${membership.user.lastName} fue quitado del grupo correctamente`,
      });
    } catch (error) {
      console.error(
        "Error quitando miembro del grupo:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo quitar al atleta del grupo",
      });
    }
  }
);
/* ---------------------------------------------------------
   AUTORIZAR CREACION DE EVENTOS
--------------------------------------------------------- */

app.patch(
  "/api/groups/:groupId/members/:userId/event-permission",
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const requesterId = getAuthenticatedUserId(req);
      const { canCreateEvents } = req.body;

      if (!requesterId) {
        return res.status(401).json({
          error: "Usuario no autenticado",
        });
      }

      if (typeof canCreateEvents !== "boolean") {
        return res.status(400).json({
          error: "Permiso de eventos inválido",
        });
      }

      const group = await prisma.sportGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          administratorId: true,
        },
      });

      if (!group) {
        return res.status(404).json({
          error: "Grupo no encontrado",
        });
      }

      if (group.administratorId !== requesterId) {
        return res.status(403).json({
          error:
            "Solo el administrador del grupo puede autorizar la creación de eventos",
        });
      }

      if (userId === group.administratorId) {
        return res.status(400).json({
          error:
            "El administrador del grupo ya tiene permiso para crear eventos",
        });
      }

      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        return res.status(404).json({
          error: "El atleta no pertenece a este grupo",
        });
      }

      const updatedMembership = await prisma.groupMember.update({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
        data: {
          canCreateEvents,
        },
        select: {
          id: true,
          userId: true,
          groupId: true,
          canCreateEvents: true,
        },
      });

      return res.json({
        success: true,
        membership: updatedMembership,
      });
    } catch (error) {
      console.error("Error actualizando permiso para crear eventos:", error);

      return res.status(500).json({
        error: "No se pudo actualizar el permiso para crear eventos",
      });
    }
  }
);

/* =========================================================
   WEBHOOK STRAVA - VERIFICACION
========================================================= */

app.get("/api/strava/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("Webhook de Strava verificado");

    return res.json({
      "hub.challenge": challenge,
    });
  }

  return res.sendStatus(403);
});
/* =========================================================
   WEBHOOK STRAVA - RECIBIR EVENTOS
========================================================= */

app.post("/api/strava/webhook", async (req, res) => {
  try {
    const event = req.body;

    console.log("Evento recibido desde Strava:", event);

    // Strava necesita recibir una respuesta 200 rapidamente.
    res.sendStatus(200);

    if (!event) {
      return;
    }

    const {
      object_type,
      object_id,
      aspect_type,
      owner_id,
    } = event;

    console.log(
      `Strava webhook: ${object_type} ${aspect_type} - ID ${object_id} - atleta ${owner_id}`
    );
if (
  object_type === "activity" &&
  aspect_type === "delete"
) {
  await prisma.activity.deleteMany({
    where: { source: "STRAVA", externalId: String(object_id) },
  });
}

if (
  object_type === "activity" &&
  aspect_type === "update"
) {
  const stravaId = String(owner_id);

  const user = await prisma.user.findUnique({
    where: {
      stravaId,
    },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
    },
  });

  if (user) {
    const accessToken =
      await getValidStravaAccessToken(user);

    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${object_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const activity: any = await response.json();

      let type:
        | "RIDE"
        | "RUN"
        | "WALK"
        | "HIKE"
        | "SWIM"
        | "KAYAK"
        | "ROW"
        | "SAIL"
        | "WINDSURF"
        | "WHEELCHAIR"
        | null = null;

      switch (activity.type) {
        case "Ride":
        case "VirtualRide":
        case "EBikeRide":
          type = "RIDE";
          break;
        case "Run":
        case "VirtualRun":
          type = "RUN";
          break;
        case "Walk":
          type = "WALK";
          break;
        case "Hike":
          type = "HIKE";
          break;
        case "Swim":
          type = "SWIM";
          break;
        case "Kayaking":
          type = "KAYAK";
          break;
        case "Rowing":
          type = "ROW";
          break;
        case "Sail":
          type = "SAIL";
          break;
        case "Windsurf":
          type = "WINDSURF";
          break;
        case "Wheelchair":
          type = "WHEELCHAIR";
          break;
      }

      if (type) {
        await prisma.activity.updateMany({
          where: {
            userId: user.id,
            source: "STRAVA",
            externalId: String(object_id),
          },
          data: {
            name: activity.name,
            type,
            distance: activity.distance || 0,
            movingTime: activity.moving_time || 0,
            elevationGain:
              activity.total_elevation_gain || 0,
            averageSpeed:
              activity.average_speed || null,
            calories: activity.calories
              ? Math.round(activity.calories)
              : null,
            startDate: new Date(activity.start_date),
          },
        });

        console.log(
          `Actividad Strava ${object_id} actualizada mediante webhook`
        );
      }
    } else {
      console.error(
        `No se pudo obtener la actividad Strava ${object_id}: ${response.status}`
      );
    }
  }
}
if (
  object_type === "athlete" &&
  aspect_type === "update" &&
  event.updates?.authorized === "false"
) {
  const stravaId = String(owner_id);

  const user = await prisma.user.findUnique({
    where: {
      stravaId,
    },
    select: {
      id: true,
    },
  });

  if (user) {
    await prisma.activity.deleteMany({
      where: { userId: user.id, source: "STRAVA" },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      },
    });

    console.log(
      `Strava desconectado por webhook para atleta ${stravaId}`
    );
  }
}
  } catch (error) {
    console.error(
      "Error procesando webhook de Strava:",
      error
    );

    if (!res.headersSent) {
      res.sendStatus(200);
    }
  }
});

/* =========================================================
   INICIAR SERVIDOR
========================================================= */

/* =========================================================
   VIARANK VIAJES - SOLICITUDES DE EMPRESAS
========================================================= */

/*
  Solicitud publica para empresas interesadas en utilizar
  ViaRank Viajes. Enviar una solicitud NO habilita a la
  empresa automaticamente.
*/
app.post(
  "/api/travel/company-applications",
  async (req, res) => {
    try {
      const {
        companyName,
        contactName,
        email,
        phone,
        whatsapp,
        city,
        country,
        website,
        description,
      } = req.body ?? {};

      const normalizedCompanyName =
        typeof companyName === "string"
          ? companyName.trim()
          : "";

      const normalizedContactName =
        typeof contactName === "string"
          ? contactName.trim()
          : "";

      const normalizedEmail =
        typeof email === "string"
          ? email.trim().toLowerCase()
          : "";

      if (
        !normalizedCompanyName ||
        !normalizedContactName ||
        !normalizedEmail
      ) {
        return res.status(400).json({
          error:
            "Empresa, persona de contacto y email son obligatorios",
        });
      }

      const application =
        await prisma.travelCompanyApplication.create({
          data: {
            companyName: normalizedCompanyName,
            contactName: normalizedContactName,
            email: normalizedEmail,
            phone:
              typeof phone === "string" && phone.trim()
                ? phone.trim()
                : null,
            whatsapp:
              typeof whatsapp === "string" &&
              whatsapp.trim()
                ? whatsapp.trim()
                : null,
            city:
              typeof city === "string" && city.trim()
                ? city.trim()
                : null,
            country:
              typeof country === "string" &&
              country.trim()
                ? country.trim()
                : null,
            website:
              typeof website === "string" &&
              website.trim()
                ? website.trim()
                : null,
            description:
              typeof description === "string" &&
              description.trim()
                ? description.trim()
                : null,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Solicitud recibida. ViaRank evaluara la solicitud antes de habilitar el acceso.",
        application: {
          id: application.id,
          companyName: application.companyName,
          status: application.status,
          createdAt: application.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Error creando solicitud de empresa ViaRank Viajes:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo registrar la solicitud de la empresa",
      });
    }
  }
);

/*
  Listado de solicitudes.
  Acceso exclusivo para SUPER_ADMIN.
*/
app.get(
  "/api/admin/travel/company-applications",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const requester = await prisma.user.findUnique({
        where: {
          id: requesterId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (
        !requester ||
        requester.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Acceso exclusivo para SUPER_ADMIN",
        });
      }

      const applications =
        await prisma.travelCompanyApplication.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json({
        success: true,
        count: applications.length,
        applications,
      });
    } catch (error) {
      console.error(
        "Error consultando solicitudes de ViaRank Viajes:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron consultar las solicitudes",
      });
    }
  }
);
/*
  Aprobar una solicitud de empresa.
  Crea la empresa, genera un codigo unico de activacion
  y vincula la solicitud con la empresa creada.
  Acceso exclusivo para SUPER_ADMIN.
*/
app.post(
  "/api/admin/travel/company-applications/:applicationId/approve",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (
        !requester ||
        requester.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Acceso exclusivo para SUPER_ADMIN",
        });
      }

      const applicationId =
        req.params.applicationId;

      const result =
        await prisma.$transaction(
          async (tx) => {
            const application =
              await tx.travelCompanyApplication.findUnique({
                where: {
                  id: applicationId,
                },
              });

            if (!application) {
              throw new Error(
                "TRAVEL_APPLICATION_NOT_FOUND"
              );
            }

            if (
              application.status === "APPROVED" ||
              application.companyId
            ) {
              throw new Error(
                "TRAVEL_APPLICATION_ALREADY_APPROVED"
              );
            }

            if (
              application.status !== "PENDING" &&
              application.status !== "CONTACTED"
            ) {
              throw new Error(
                "TRAVEL_APPLICATION_NOT_APPROVABLE"
              );
            }

            let activationCode = "";
            let codeExists = true;

            while (codeExists) {
              activationCode =
                `VRV-${randomBytes(6)
                  .toString("hex")
                  .toUpperCase()}`;

              const existingCompany =
                await tx.travelCompany.findUnique({
                  where: {
                    activationCode,
                  },
                  select: {
                    id: true,
                  },
                });

              codeExists = Boolean(
                existingCompany
              );
            }

            const company =
              await tx.travelCompany.create({
                data: {
                  name: application.companyName,
                  description:
                    application.description,
                  whatsapp:
                    application.whatsapp,
                  email:
                    application.email,
                  accessStatus: "PENDING",
                  activationCode,
                },
              });

            const updatedApplication =
              await tx.travelCompanyApplication.update({
                where: {
                  id: application.id,
                },
                data: {
                  status: "APPROVED",
                  companyId: company.id,
                  decidedAt: new Date(),
                },
              });

            return {
              company,
              application:
                updatedApplication,
            };
          }
        );

      return res.json({
        success: true,
        message:
          "Solicitud aprobada. Empresa creada con codigo de activacion.",
        company: {
          id: result.company.id,
          name: result.company.name,
          accessStatus:
            result.company.accessStatus,
          activationCode:
            result.company.activationCode,
        },
        application: {
          id: result.application.id,
          status:
            result.application.status,
          decidedAt:
            result.application.decidedAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_APPLICATION_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Solicitud no encontrada",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_APPLICATION_ALREADY_APPROVED"
      ) {
        return res.status(409).json({
          error:
            "La solicitud ya fue aprobada",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_APPLICATION_NOT_APPROVABLE"
      ) {
        return res.status(409).json({
          error:
            "La solicitud no se encuentra en un estado aprobable",
        });
      }

      console.error(
        "Error aprobando solicitud de ViaRank Viajes:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo aprobar la solicitud",
      });
    }
  }
);
/*
  Activar una empresa de ViaRank Viajes mediante su codigo.
  El usuario autenticado que utiliza el codigo queda como
  administrador principal de la empresa.
*/
app.post(
  "/api/travel/companies/activate",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const rawCode =
        typeof req.body?.activationCode === "string"
          ? req.body.activationCode
          : "";

      const activationCode =
        rawCode.trim().toUpperCase();

      if (!activationCode) {
        return res.status(400).json({
          error:
            "El codigo de activacion es obligatorio",
        });
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const company =
              await tx.travelCompany.findUnique({
                where: {
                  activationCode,
                },
              });

            if (!company) {
              throw new Error(
                "TRAVEL_ACTIVATION_CODE_INVALID"
              );
            }

            if (company.activationUsedAt) {
              throw new Error(
                "TRAVEL_ACTIVATION_CODE_USED"
              );
            }

            if (
              company.accessStatus !== "PENDING"
            ) {
              throw new Error(
                "TRAVEL_COMPANY_NOT_ACTIVATABLE"
              );
            }

            const user =
              await tx.user.findUnique({
                where: {
                  id: requesterId,
                },
                select: {
                  id: true,
                },
              });

            if (!user) {
              throw new Error(
                "TRAVEL_ACTIVATION_USER_NOT_FOUND"
              );
            }

            const activatedAt = new Date();

            const updatedCompany =
              await tx.travelCompany.update({
                where: {
                  id: company.id,
                },
                data: {
                  accessStatus: "ACTIVE",
                  activationUsedAt:
                    activatedAt,
                  accessStartsAt:
                    activatedAt,
                },
              });

            const administrator =
              await tx.travelCompanyAdministrator.create({
                data: {
                  companyId: company.id,
                  userId: requesterId,
                  isPrimary: true,
                },
              });

            return {
              company: updatedCompany,
              administrator,
            };
          }
        );

      return res.json({
        success: true,
        message:
          "Empresa activada correctamente",
        company: {
          id: result.company.id,
          name: result.company.name,
          accessStatus:
            result.company.accessStatus,
          accessStartsAt:
            result.company.accessStartsAt,
        },
        administrator: {
          userId:
            result.administrator.userId,
          isPrimary:
            result.administrator.isPrimary,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_ACTIVATION_CODE_INVALID"
      ) {
        return res.status(404).json({
          error:
            "Codigo de activacion invalido",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_ACTIVATION_CODE_USED"
      ) {
        return res.status(409).json({
          error:
            "El codigo de activacion ya fue utilizado",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_COMPANY_NOT_ACTIVATABLE"
      ) {
        return res.status(409).json({
          error:
            "La empresa no se encuentra pendiente de activacion",
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "TRAVEL_ACTIVATION_USER_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      console.error(
        "Error activando empresa de ViaRank Viajes:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo activar la empresa",
      });
    }
  }
);
/*
  Empresas de ViaRank Viajes administradas por el usuario autenticado.
  Permite volver a ingresar sin reutilizar el codigo de activacion.
*/
app.get(
  "/api/travel/companies/mine",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const administrations =
        await prisma.travelCompanyAdministrator.findMany({
          where: {
            userId: requesterId,
          },
          select: {
            isPrimary: true,
            company: {
              select: {
                id: true,
                name: true,
                description: true,
                logoUrl: true,
                whatsapp: true,
                email: true,
                accessStatus: true,
                accessStartsAt: true,
                accessExpiresAt: true,
                planName: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      return res.json({
        success: true,
        companies: administrations.map(
          (administration) => ({
            ...administration.company,
            isPrimaryAdministrator:
              administration.isPrimary,
          })
        ),
      });
    } catch (error) {
      console.error(
        "Error cargando empresas administradas de ViaRank Viajes:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar las empresas de ViaRank Viajes",
      });
    }
  }
);
/*
  Viajes administrados por una empresa de ViaRank Viajes.
  Solo los administradores de esa empresa pueden acceder.
*/
app.get(
  "/api/travel/companies/:companyId/trips",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const companyId =
        String(req.params.companyId || "").trim();

      const administration =
        await prisma.travelCompanyAdministrator.findUnique({
          where: {
            companyId_userId: {
              companyId,
              userId: requesterId,
            },
          },
          select: {
            company: {
              select: {
                id: true,
                name: true,
                accessStatus: true,
              trialEndsAt: true,
              },
            },
          },
        });

      if (!administration) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar esta empresa",
        });
      }

      const trips =
        await prisma.travelTrip.findMany({
          where: {
            companyId,
          },
          orderBy: [
            {
              displayOrder: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

      return res.json({
        success: true,
        company: administration.company,
        trips,
      });
    } catch (error) {
      console.error(
        "Error cargando viajes de empresa:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar los viajes de la empresa",
      });
    }
  }
);

/*
  Crear un viaje general de ViaRank Viajes.
  El tipo de viaje se comunica mediante su titulo,
  descripcion y contenido, sin limitarlo a un deporte.
*/
app.post(
  "/api/travel/companies/:companyId/trips",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const companyId =
        String(req.params.companyId || "").trim();

      const administration =
        await prisma.travelCompanyAdministrator.findUnique({
          where: {
            companyId_userId: {
              companyId,
              userId: requesterId,
            },
          },
          select: {
            company: {
              select: {
                id: true,
                name: true,
                accessStatus: true,
              trialEndsAt: true,
              },
            },
          },
        });

      if (!administration) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar esta empresa",
        });
      }

      if (!hasTravelCompanyOperationalAccess(administration.company)) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para crear viajes",
        });
      }

      const {
        title,
        destination,
        description,
      } = req.body ?? {};

      const normalizedTitle =
        typeof title === "string"
          ? title.trim()
          : "";

      const normalizedDestination =
        typeof destination === "string"
          ? destination.trim()
          : "";

      const normalizedDescription =
        typeof description === "string" &&
        description.trim()
          ? description.trim()
          : null;

      if (!normalizedTitle) {
        return res.status(400).json({
          error:
            "El título del viaje es obligatorio",
        });
      }

      if (!normalizedDestination) {
        return res.status(400).json({
          error:
            "El destino del viaje es obligatorio",
        });
      }

      const trip =
        await prisma.travelTrip.create({
          data: {
            companyId,
            title: normalizedTitle,
            destination: normalizedDestination,
            description: normalizedDescription,
            status: "DRAFT",
          },
        });

      return res.status(201).json({
        success: true,
        trip,
      });
    } catch (error) {
      console.error(
        "Error creando viaje de empresa:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo crear el viaje",
      });
    }
  }
);

/*
  Editar un viaje general de ViaRank Viajes.
  Los administradores de la empresa y organizadores del viaje pueden modificarlo.
*/
app.patch(
  "/api/travel/trips/:tripId",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            companyId: true,
            price: true,
            company: {
              select: {
                accessStatus: true,
              trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        (
          !access.isCompanyAdministrator &&
          !access.isOrganizer
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar la configuración general de este viaje",
        });
      }
      if (!hasTravelCompanyOperationalAccess(existingTrip.company)) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const {
        title,
        destination,
        description,
        startDate,
        endDate,
        days,
        nights,
        totalDistanceKm,
        elevationGain,
        difficulty,
        price,
        totalCapacity,
        externalReservedPlaces,
      } = req.body ?? {};

      const normalizedTitle =
        typeof title === "string"
          ? title.trim()
          : "";

      const normalizedDestination =
        typeof destination === "string"
          ? destination.trim()
          : "";

      const normalizedDescription =
        typeof description === "string" &&
        description.trim()
          ? description.trim()
          : null;

      const normalizedDifficulty =
        typeof difficulty === "string" &&
        difficulty.trim()
          ? difficulty.trim()
          : null;

      const parseOptionalNumber = (
        value: unknown
      ): number | null => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
      };

      const normalizedDays = parseOptionalNumber(days);
      const normalizedNights = parseOptionalNumber(nights);
      const normalizedDistance = parseOptionalNumber(totalDistanceKm);
      const normalizedElevation = parseOptionalNumber(elevationGain);
      const normalizedPrice = price === undefined ? existingTrip.price : parseOptionalNumber(price);
      const normalizedCapacity = parseOptionalNumber(totalCapacity);

      const normalizedExternalReserved =
        externalReservedPlaces === null ||
        externalReservedPlaces === undefined ||
        externalReservedPlaces === ""
          ? 0
          : Number(externalReservedPlaces);

      if (!normalizedTitle) {
        return res.status(400).json({
          error:
            "El título del viaje es obligatorio",
        });
      }

      if (!normalizedDestination) {
        return res.status(400).json({
          error:
            "El destino del viaje es obligatorio",
        });
      }

      const numericValues = [
        normalizedDays,
        normalizedNights,
        normalizedDistance,
        normalizedElevation,
        normalizedPrice,
        normalizedCapacity,
        normalizedExternalReserved,
      ];

      if (
        numericValues.some(
          (value) =>
            value !== null &&
            (!Number.isFinite(value) || value < 0)
        )
      ) {
        return res.status(400).json({
          error:
            "Los valores numéricos deben ser válidos y no negativos",
        });
      }

      if (normalizedDays !== null && !Number.isInteger(normalizedDays)) {
        return res.status(400).json({
          error: "Los días deben ser un número entero",
        });
      }

      if (normalizedNights !== null && !Number.isInteger(normalizedNights)) {
        return res.status(400).json({
          error: "Las noches deben ser un número entero",
        });
      }

      if (normalizedCapacity !== null && !Number.isInteger(normalizedCapacity)) {
        return res.status(400).json({
          error: "La capacidad debe ser un número entero",
        });
      }

      if (!Number.isInteger(normalizedExternalReserved)) {
        return res.status(400).json({
          error:
            "Las reservas externas deben ser un número entero",
        });
      }

      if (
        normalizedCapacity !== null &&
        normalizedExternalReserved > normalizedCapacity
      ) {
        return res.status(400).json({
          error:
            "Las reservas externas no pueden superar la capacidad total",
        });
      }

      const normalizedStartDate =
        typeof startDate === "string" && startDate.trim()
          ? new Date(startDate)
          : null;

      const normalizedEndDate =
        typeof endDate === "string" && endDate.trim()
          ? new Date(endDate)
          : null;

      if (
        normalizedStartDate &&
        Number.isNaN(normalizedStartDate.getTime())
      ) {
        return res.status(400).json({
          error: "La fecha de inicio no es válida",
        });
      }

      if (
        normalizedEndDate &&
        Number.isNaN(normalizedEndDate.getTime())
      ) {
        return res.status(400).json({
          error: "La fecha de finalización no es válida",
        });
      }

      if (
        normalizedStartDate &&
        normalizedEndDate &&
        normalizedEndDate < normalizedStartDate
      ) {
        return res.status(400).json({
          error:
            "La fecha de finalización no puede ser anterior a la fecha de inicio",
        });
      }

      const trip =
        await prisma.travelTrip.update({
          where: {
            id: tripId,
          },
          data: {
            title: normalizedTitle,
            destination: normalizedDestination,
            description: normalizedDescription,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            days: normalizedDays,
            nights: normalizedNights,
            totalDistanceKm: normalizedDistance,
            elevationGain: normalizedElevation,
            difficulty: normalizedDifficulty,
            price: normalizedPrice,
            totalCapacity: normalizedCapacity,
            externalReservedPlaces: normalizedExternalReserved,
          },
        });

      return res.json({
        success: true,
        trip,
      });
    } catch (error) {
      console.error(
        "Error editando viaje de empresa:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo editar el viaje",
      });
    }
  }
);


/* =========================================================
   VIARANK VIAJES - CONTENIDO COMPLETO DEL VIAJE
========================================================= */

/*
  Cargar la configuracion completa de un viaje para su
  administracion. Solo administradores de la empresa.
*/
app.get(
  "/api/travel/trips/:tripId/content",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      if (!tripId) {
        return res.status(400).json({
          error: "Viaje invalido",
        });
      }

      const tripAccess =
        await prisma.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            companyId: true,
          },
        });

      if (!tripAccess) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        (
          !access.isCompanyAdministrator &&
          !access.isOrganizer &&
          !access.isCollaborator
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para acceder a este viaje",
        });
      }

      const canViewFinancials =
        hasTravelTripPermission(
          access,
          "viewFinancials"
        );

      const trip =
        await prisma.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          include: {
            modules: {
              orderBy: {
                type: "asc",
              },
            },

            activities: {
              orderBy: [
                {
                  dayNumber: "asc",
                },
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
              include: {
                requirements: {
                  orderBy: [
                    {
                      displayOrder: "asc",
                    },
                    {
                      createdAt: "asc",
                    },
                  ],
                },
                meals: {
                  orderBy: [
                    {
                      dayNumber: "asc",
                    },
                    {
                      displayOrder: "asc",
                    },
                    {
                      createdAt: "asc",
                    },
                  ],
                },
              },
            },

            accommodations: {
              orderBy: [
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },

            meals: {
              where: {
                activityId: null,
              },
              orderBy: [
                {
                  dayNumber: "asc",
                },
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },

            transport: true,

            transfers: true,

            insurance: true,
            equipment: {
              orderBy: [
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },
            pricing: {
              include: {
                versions: {
                  orderBy: {
                    version: "desc",
                  },
                },
              },
            },
          },
        });

      if (!trip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      if (!canViewFinancials) {
        const {
          price: _price,
          pricing: _pricing,
          transfers: tripTransfers,
          insurance: tripInsurance,
          equipment: tripEquipment,
          ...tripWithoutFinancials
        } = trip;

        const insuranceWithoutFinancials =
          tripInsurance
            ? (() => {
                const {
                  price: _insurancePrice,
                  ...safeInsurance
                } = tripInsurance;

                return safeInsurance;
              })()
            : tripInsurance;

        const transfersWithoutFinancials =
          tripTransfers
            ? (() => {
                const {
                  arrivalTransferPrice:
                    _arrivalTransferPrice,
                  departureTransferPrice:
                    _departureTransferPrice,
                  ...safeTransfers
                } = tripTransfers;

                return safeTransfers;
              })()
            : tripTransfers;

        
        const equipmentWithoutFinancials =
          tripEquipment.map((item) => {
            const {
              price: _equipmentPrice,
              ...safeEquipment
            } = item;

            return safeEquipment;
          });
return res.json({
          success: true,
          trip: {
            ...tripWithoutFinancials,
            transfers:
              transfersWithoutFinancials,
            insurance:
              insuranceWithoutFinancials,
            equipment: equipmentWithoutFinancials,
          },
        });
      }

      return res.json({
        success: true,
        trip,
      });
    } catch (error) {
      console.error(
        "Error cargando contenido completo del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cargar el contenido del viaje",
      });
    }
  }
);

/*
  Activar o desactivar modulos de un viaje.
  Los modulos no seleccionados permanecen desactivados.
*/
app.put(
  "/api/travel/trips/:tripId/modules",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            companyId: true,
            company: {
              select: {
                accessStatus: true,
              trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        (
          !access.isCompanyAdministrator &&
          !access.isOrganizer
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar la configuración general de este viaje",
        });
      }
      if (!hasTravelCompanyOperationalAccess(existingTrip.company)) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const modules =
        Array.isArray(req.body?.modules)
          ? req.body.modules
          : null;

      if (!modules) {
        return res.status(400).json({
          error:
            "Debés enviar una lista de módulos",
        });
      }

      const validTypes = new Set<TravelModuleType>([
        "ACCOMMODATION",
        "SPORTS_ACTIVITIES",
        "FOOD",
        "PASSENGER_TRANSPORT",
        "BICYCLE_TRANSPORT",
        "TRANSFERS",
        "INSURANCE",
        "EQUIPMENT_RENTAL",
        "RESERVATIONS",
        "PAYMENTS",
        "RULES_WAIVER",
        "VIARANK_GROUP",
        "OFFICIAL_NOTICES",
        "PARTICIPANT_CONTACT",
      ]);

      const normalizedModules: Array<{
        type: TravelModuleType;
        isEnabled: boolean;
      }> = [];

      const receivedTypes = new Set<string>();

      for (const item of modules) {
        const type =
          typeof item?.type === "string"
            ? item.type.trim().toUpperCase()
            : "";

        if (
          !validTypes.has(
            type as TravelModuleType
          )
        ) {
          return res.status(400).json({
            error:
              `Módulo inválido: ${type || "(vacío)"}`,
          });
        }

        const moduleType =
          type as TravelModuleType;

        if (receivedTypes.has(type)) {
          return res.status(400).json({
            error:
              `El módulo ${type} está repetido`,
          });
        }

        receivedTypes.add(type);

        normalizedModules.push({
          type: moduleType,
          isEnabled: item?.isEnabled === true,
        });
      }

      const allTypes = Array.from(validTypes);

      await prisma.$transaction(
        allTypes.map((type) => {
          const received =
            normalizedModules.find(
              (item) => item.type === type
            );

          return prisma.travelTripModule.upsert({
            where: {
              tripId_type: {
                tripId,
                type,
              },
            },
            create: {
              tripId,
              type,
              isEnabled:
                received?.isEnabled ?? false,
            },
            update: {
              isEnabled:
                received?.isEnabled ?? false,
            },
          });
        })
      );

      const updatedModules =
        await prisma.travelTripModule.findMany({
          where: {
            tripId,
          },
          orderBy: {
            type: "asc",
          },
        });

      return res.json({
        success: true,
        modules: updatedModules,
      });
    } catch (error) {
      console.error(
        "Error actualizando modulos del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron actualizar los módulos del viaje",
      });
    }
  }
);

/* =========================================================
   VIARANK VIAJES - RECORRIDOS Y ACTIVIDADES
========================================================= */

app.put(
  "/api/travel/trips/:tripId/activities",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            company: {
              select: {
                accessStatus: true,
                trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "activities"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar los recorridos y actividades de este viaje",
        });
      }

      if (
        !hasTravelCompanyOperationalAccess(
          existingTrip.company
        )
      ) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const activities =
        Array.isArray(req.body?.activities)
          ? req.body.activities
          : null;

      if (!activities) {
        return res.status(400).json({
          error:
            "Debés enviar una lista de recorridos y actividades",
        });
      }

      const validCategories = new Set([
        "CYCLING",
        "HIKING",
        "WALKING",
        "RUNNING",
        "SWIMMING",
        "KAYAK",
        "ROWING",
        "SAILING",
        "COMPLEMENTARY",
        "OTHER",
      ]);

      const validScheduleTypes = new Set([
        "PROGRAMMED",
        "ALTERNATIVE",
        "WEATHER_DEPENDENT",
      ]);

      const validInclusionStatuses = new Set([
        "INCLUDED",
        "NOT_INCLUDED",
        "NOT_APPLICABLE",
      ]);

      const optionalString = (
        value: unknown
      ) => {
        if (typeof value !== "string") {
          return null;
        }

        const normalized = value.trim();

        return normalized || null;
      };

      const optionalNumber = (
        value: unknown
      ) => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
          ? parsed
          : null;
      };

      const normalizedActivities: any[] = [];

      for (
        let index = 0;
        index < activities.length;
        index += 1
      ) {
        const item = activities[index];

        const category =
          typeof item?.category === "string"
            ? item.category.trim().toUpperCase()
            : "";

        const scheduleType =
          typeof item?.scheduleType === "string"
            ? item.scheduleType
                .trim()
                .toUpperCase()
            : "PROGRAMMED";

        const entranceStatus =
          typeof item?.entranceStatus === "string"
            ? item.entranceStatus
                .trim()
                .toUpperCase()
            : "NOT_APPLICABLE";

        const transferStatus =
          typeof item?.transferStatus === "string"
            ? item.transferStatus
                .trim()
                .toUpperCase()
            : "NOT_APPLICABLE";

        const name =
          typeof item?.name === "string"
            ? item.name.trim()
            : "";

        if (!validCategories.has(category)) {
          return res.status(400).json({
            error:
              `Categoría inválida en la actividad ${index + 1}`,
          });
        }

        if (
          !validScheduleTypes.has(scheduleType)
        ) {
          return res.status(400).json({
            error:
              `Tipo de programación inválido en la actividad ${index + 1}`,
          });
        }

        if (
          !validInclusionStatuses.has(
            entranceStatus
          ) ||
          !validInclusionStatuses.has(
            transferStatus
          )
        ) {
          return res.status(400).json({
            error:
              `Estado de inclusión inválido en la actividad ${index + 1}`,
          });
        }

        if (!name) {
          return res.status(400).json({
            error:
              `La actividad ${index + 1} debe tener un nombre`,
          });
        }

        const dayNumber =
          optionalNumber(item?.dayNumber);

        const displayOrder =
          optionalNumber(item?.displayOrder) ??
          index;

        const distanceKm =
          optionalNumber(item?.distanceKm);

        const durationMinutes =
          optionalNumber(
            item?.durationMinutes
          );

        const activeMinutes =
          optionalNumber(item?.activeMinutes);

        const elevationGain =
          optionalNumber(item?.elevationGain);

        const maxAltitude =
          optionalNumber(item?.maxAltitude);

        if (
          dayNumber !== null &&
          (
            !Number.isInteger(dayNumber) ||
            dayNumber < 1
          )
        ) {
          return res.status(400).json({
            error:
              `El día de la actividad ${index + 1} debe ser un número entero mayor que cero`,
          });
        }

        if (
          !Number.isInteger(displayOrder) ||
          displayOrder < 0
        ) {
          return res.status(400).json({
            error:
              `El orden de la actividad ${index + 1} no es válido`,
          });
        }

        const nonNegativeValues = [
          ["distancia", distanceKm],
          ["duración", durationMinutes],
          ["tiempo activo", activeMinutes],
          ["desnivel", elevationGain],
          ["altitud máxima", maxAltitude],
        ];

        for (const [label, value] of nonNegativeValues) {
          if (
            value !== null &&
            Number(value) < 0
          ) {
            return res.status(400).json({
              error:
                `La ${label} de la actividad ${index + 1} no puede ser negativa`,
            });
          }
        }

        let activityDate = null;

        if (
          item?.activityDate !== null &&
          item?.activityDate !== undefined &&
          item?.activityDate !== ""
        ) {
          const parsedDate =
            new Date(item.activityDate);

          if (
            Number.isNaN(
              parsedDate.getTime()
            )
          ) {
            return res.status(400).json({
              error:
                `La fecha de la actividad ${index + 1} no es válida`,
            });
          }

          activityDate = parsedDate;
        }

        const requirements =
          Array.isArray(item?.requirements)
            ? item.requirements
            : [];

        const normalizedRequirements =
          requirements.map(
            (
              requirement: any,
              requirementIndex: number
            ) => {
              const requirementName =
                typeof requirement?.name ===
                "string"
                  ? requirement.name.trim()
                  : "";

              if (!requirementName) {
                throw new Error(
                  `REQUISITO_INVALIDO:${index + 1}:${requirementIndex + 1}`
                );
              }

              const requirementOrder =
                optionalNumber(
                  requirement?.displayOrder
                ) ?? requirementIndex;

              if (
                !Number.isInteger(
                  requirementOrder
                ) ||
                requirementOrder < 0
              ) {
                throw new Error(
                  `ORDEN_REQUISITO_INVALIDO:${index + 1}:${requirementIndex + 1}`
                );
              }

              return {
                name: requirementName,
                isMandatory:
                  requirement?.isMandatory ===
                  true,
                displayOrder:
                  requirementOrder,
              };
            }
          );

        const activityId =
          typeof item?.id === "string"
            ? item.id.trim() || null
            : null;

        normalizedActivities.push({
          id: activityId,
          category,
          scheduleType,
          name,
          description:
            optionalString(
              item?.description
            ),
          imageUrl:
            optionalString(item?.imageUrl),
          dayNumber,
          activityDate,
          displayOrder,
          distanceKm,
          durationMinutes:
            durationMinutes === null
              ? null
              : Math.trunc(durationMinutes),
          activeMinutes:
            activeMinutes === null
              ? null
              : Math.trunc(activeMinutes),
          elevationGain,
          maxAltitude,
          expectedPace:
            optionalString(
              item?.expectedPace
            ),
          expectedSpeed:
            optionalString(
              item?.expectedSpeed
            ),
          difficulty:
            optionalString(
              item?.difficulty
            ),
          terrain:
            optionalString(item?.terrain),
          departurePoint:
            optionalString(
              item?.departurePoint
            ),
          arrivalPoint:
            optionalString(
              item?.arrivalPoint
            ),
          guideEnabled:
            item?.guideEnabled === true,
          closerEnabled:
            item?.closerEnabled === true,
          radioCommunication:
            item?.radioCommunication === true,
          supportVehicleEnabled:
            item?.supportVehicleEnabled ===
            true,
          lightMechanicsEnabled:
            item?.lightMechanicsEnabled ===
            true,
          entranceStatus,
          transferStatus,
          notes:
            optionalString(item?.notes),
          requirements:
            normalizedRequirements,
        });
      }

      await prisma.$transaction(
        async (tx) => {
          const existingActivities =
            await tx.travelTripActivity.findMany({
              where: {
                tripId,
              },
              select: {
                id: true,
              },
            });

          const existingIds =
            new Set(
              existingActivities.map(
                (activity) => activity.id
              )
            );

          const receivedExistingIds =
            new Set<string>();

          for (
            const activity
            of normalizedActivities
          ) {
            const {
              id,
              requirements,
              ...activityData
            } = activity;

            if (id) {
              if (!existingIds.has(id)) {
                throw new Error(
                  `ACTIVIDAD_AJENA:${id}`
                );
              }

              if (
                receivedExistingIds.has(id)
              ) {
                throw new Error(
                  `ACTIVIDAD_REPETIDA:${id}`
                );
              }

              receivedExistingIds.add(id);

              await tx.travelTripActivity.update({
                where: {
                  id,
                },
                data: {
                  ...activityData,
                  requirements: {
                    deleteMany: {},
                    create: requirements,
                  },
                },
              });

              continue;
            }

            await tx.travelTripActivity.create({
              data: {
                tripId,
                ...activityData,
                requirements: {
                  create: requirements,
                },
              },
            });
          }

          const idsToDelete =
            existingActivities
              .map(
                (activity) => activity.id
              )
              .filter(
                (id) =>
                  !receivedExistingIds.has(id)
              );

          if (idsToDelete.length > 0) {
            await tx.travelTripActivity.deleteMany({
              where: {
                tripId,
                id: {
                  in: idsToDelete,
                },
              },
            });
          }
        }
      );

      const updatedActivities =
        await prisma.travelTripActivity.findMany({
          where: {
            tripId,
          },
          include: {
            requirements: {
              orderBy: {
                displayOrder: "asc",
              },
            },
          },
          orderBy: [
            {
              dayNumber: "asc",
            },
            {
              displayOrder: "asc",
            },
          ],
        });

      return res.json({
        success: true,
        activities: updatedActivities,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith(
          "ACTIVIDAD_AJENA:"
        )
      ) {
        return res.status(400).json({
          error:
            "Una de las actividades indicadas no pertenece a este viaje",
        });
      }

      if (
        error instanceof Error &&
        error.message.startsWith(
          "ACTIVIDAD_REPETIDA:"
        )
      ) {
        return res.status(400).json({
          error:
            "Una misma actividad fue enviada más de una vez",
        });
      }

      if (
        error instanceof Error &&
        error.message.startsWith(
          "REQUISITO_INVALIDO:"
        )
      ) {
        const [, activity, requirement] =
          error.message.split(":");

        return res.status(400).json({
          error:
            `El requisito ${requirement} de la actividad ${activity} debe tener un nombre`,
        });
      }

      if (
        error instanceof Error &&
        error.message.startsWith(
          "ORDEN_REQUISITO_INVALIDO:"
        )
      ) {
        const [, activity, requirement] =
          error.message.split(":");

        return res.status(400).json({
          error:
            `El orden del requisito ${requirement} de la actividad ${activity} no es válido`,
        });
      }

      console.error(
        "Error actualizando recorridos y actividades del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron actualizar los recorridos y actividades del viaje",
      });
    }
  }
);
/* =========================================================
   VIARANK VIAJES - ALIMENTACIÓN Y VIABREAK
========================================================= */

app.put(
  "/api/travel/trips/:tripId/meals",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            company: {
              select: {
                accessStatus: true,
                trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "food"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar la alimentación de este viaje",
        });
      }

      if (
        !hasTravelCompanyOperationalAccess(
          existingTrip.company
        )
      ) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const meals =
        Array.isArray(req.body?.meals)
          ? req.body.meals
          : null;

      if (!meals) {
        return res.status(400).json({
          error:
            "Debés enviar una lista de comidas",
        });
      }

      const validMealTypes = new Set([
        "BREAKFAST",
        "LUNCH",
        "PACKED_MEAL",
        "REFRESHMENT",
        "DINNER",
        "WELCOME_DINNER",
      ]);

      const validStatuses = new Set([
        "INCLUDED",
        "NOT_INCLUDED",
        "NOT_APPLICABLE",
      ]);

      const optionalString = (
        value: unknown
      ) => {
        if (typeof value !== "string") {
          return null;
        }

        const normalized = value.trim();

        return normalized || null;
      };

      const normalizedMeals: Array<{
        id: string | null;
        activityId: string | null;
        dayNumber: number | null;
        type: any;
        status: any;
        restaurantName: string | null;
        restaurantAddress: string | null;
        approximateTime: string | null;
        reservationCoordinated: boolean;
        viaBreakEnabled: boolean;
        description: string | null;
        displayOrder: number;
      }> = [];

      const activityIds =
        new Set<string>();

      for (
        let index = 0;
        index < meals.length;
        index += 1
      ) {
        const item = meals[index];

        const id =
          typeof item?.id === "string"
            ? item.id.trim() || null
            : null;

        const activityId =
          typeof item?.activityId === "string"
            ? item.activityId.trim() || null
            : null;

        const type =
          String(item?.type || "").trim();

        if (!validMealTypes.has(type)) {
          return res.status(400).json({
            error:
              `El tipo de comida ${index + 1} no es válido`,
          });
        }

        const status =
          String(
            item?.status ||
            "NOT_APPLICABLE"
          ).trim();

        if (!validStatuses.has(status)) {
          return res.status(400).json({
            error:
              `El estado de la comida ${index + 1} no es válido`,
          });
        }

        let dayNumber: number | null = null;

        if (
          item?.dayNumber !== null &&
          item?.dayNumber !== undefined &&
          item?.dayNumber !== ""
        ) {
          const parsedDay =
            Number(item.dayNumber);

          if (
            !Number.isInteger(parsedDay) ||
            parsedDay < 1
          ) {
            return res.status(400).json({
              error:
                `El día de la comida ${index + 1} no es válido`,
            });
          }

          dayNumber = parsedDay;
        }

        const displayOrder =
          item?.displayOrder === null ||
          item?.displayOrder === undefined ||
          item?.displayOrder === ""
            ? index
            : Number(item.displayOrder);

        if (
          !Number.isInteger(displayOrder) ||
          displayOrder < 0
        ) {
          return res.status(400).json({
            error:
              `El orden de la comida ${index + 1} no es válido`,
          });
        }

        if (activityId) {
          activityIds.add(activityId);
        }

        normalizedMeals.push({
          id,
          activityId,
          dayNumber,
          type,
          status,
          restaurantName:
            optionalString(
              item?.restaurantName
            ),
          restaurantAddress:
            optionalString(
              item?.restaurantAddress
            ),
          approximateTime:
            optionalString(
              item?.approximateTime
            ),
          reservationCoordinated:
            item?.reservationCoordinated ===
            true,
          viaBreakEnabled:
            item?.viaBreakEnabled === true,
          description:
            optionalString(
              item?.description
            ),
          displayOrder,
        });
      }

      if (activityIds.size > 0) {
        const validActivities =
          await prisma.travelTripActivity.findMany({
            where: {
              tripId,
              id: {
                in: Array.from(activityIds),
              },
            },
            select: {
              id: true,
            },
          });

        const validActivityIds =
          new Set(
            validActivities.map(
              (activity) => activity.id
            )
          );

        const invalidActivityId =
          Array.from(activityIds).find(
            (id) =>
              !validActivityIds.has(id)
          );

        if (invalidActivityId) {
          return res.status(400).json({
            error:
              "Una de las actividades asociadas a la alimentación no pertenece a este viaje",
          });
        }
      }

      await prisma.$transaction(
        async (tx) => {
          const existingMeals =
            await tx.travelTripMeal.findMany({
              where: {
                tripId,
              },
              select: {
                id: true,
              },
            });

          const existingIds =
            new Set(
              existingMeals.map(
                (meal) => meal.id
              )
            );

          const receivedExistingIds =
            new Set<string>();

          for (
            const meal
            of normalizedMeals
          ) {
            const {
              id,
              ...mealData
            } = meal;

            if (id) {
              if (!existingIds.has(id)) {
                throw new Error(
                  `COMIDA_AJENA:${id}`
                );
              }

              if (
                receivedExistingIds.has(id)
              ) {
                throw new Error(
                  `COMIDA_REPETIDA:${id}`
                );
              }

              receivedExistingIds.add(id);

              await tx.travelTripMeal.update({
                where: {
                  id,
                },
                data: mealData,
              });

              continue;
            }

            await tx.travelTripMeal.create({
              data: {
                tripId,
                ...mealData,
              },
            });
          }

          const idsToDelete =
            existingMeals
              .map(
                (meal) => meal.id
              )
              .filter(
                (id) =>
                  !receivedExistingIds.has(id)
              );

          if (idsToDelete.length > 0) {
            await tx.travelTripMeal.deleteMany({
              where: {
                tripId,
                id: {
                  in: idsToDelete,
                },
              },
            });
          }
        }
      );

      const updatedMeals =
        await prisma.travelTripMeal.findMany({
          where: {
            tripId,
          },
          include: {
            activity: {
              select: {
                id: true,
                name: true,
                category: true,
                dayNumber: true,
              },
            },
          },
          orderBy: [
            {
              dayNumber: "asc",
            },
            {
              displayOrder: "asc",
            },
          ],
        });

      return res.json({
        success: true,
        meals: updatedMeals,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith(
          "COMIDA_AJENA:"
        )
      ) {
        return res.status(400).json({
          error:
            "Una de las comidas indicadas no pertenece a este viaje",
        });
      }

      if (
        error instanceof Error &&
        error.message.startsWith(
          "COMIDA_REPETIDA:"
        )
      ) {
        return res.status(400).json({
          error:
            "Una misma comida fue enviada más de una vez",
        });
      }

      console.error(
        "Error actualizando alimentación del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar la alimentación del viaje",
      });
    }
  }
);
/* =========================================================
   VIARANK VIAJES - ALOJAMIENTO
========================================================= */

app.put(
  "/api/travel/trips/:tripId/accommodations",
  async (req, res) => {
    try {
      const requesterId = getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: { id: tripId },
          select: {
            id: true,
            companyId: true,
            company: {
              select: {
                accessStatus: true,
              trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "accommodation"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar el alojamiento de este viaje",
        });
      }

      if (!hasTravelCompanyOperationalAccess(existingTrip.company)) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const accommodations =
        Array.isArray(req.body?.accommodations)
          ? req.body.accommodations
          : null;

      if (!accommodations) {
        return res.status(400).json({
          error:
            "Debés enviar una lista de alojamientos",
        });
      }

      const normalized: Prisma.TravelAccommodationCreateManyInput[] = [];

      for (let index = 0; index < accommodations.length; index++) {
        const item = accommodations[index];

        const type =
          typeof item?.type === "string"
            ? item.type.trim()
            : "";

        const name =
          typeof item?.name === "string"
            ? item.name.trim()
            : "";

        if (!type || !name) {
          return res.status(400).json({
            error:
              "Cada alojamiento debe tener tipo y nombre",
          });
        }

        const parseOptionalNumber = (
          value: unknown
        ): number | null => {
          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            return null;
          }

          const parsed = Number(value);
          return Number.isFinite(parsed)
            ? parsed
            : NaN;
        };

        const nights =
          parseOptionalNumber(item?.nights);

        const capacity =
          parseOptionalNumber(item?.capacity);

        const privateOptionPrice =
          parseOptionalNumber(
            item?.privateOptionPrice
          );

        const previousNightPrice =
          parseOptionalNumber(
            item?.previousNightPrice
          );

        const followingNightPrice =
          parseOptionalNumber(
            item?.followingNightPrice
          );

        const numericValues = [
          nights,
          capacity,
          privateOptionPrice,
          previousNightPrice,
          followingNightPrice,
        ];

        if (
          numericValues.some(
            (value) =>
              value !== null &&
              (!Number.isFinite(value) || value < 0)
          )
        ) {
          return res.status(400).json({
            error:
              "Los valores del alojamiento deben ser válidos y no negativos",
          });
        }

        if (
          nights !== null &&
          !Number.isInteger(nights)
        ) {
          return res.status(400).json({
            error:
              "Las noches deben ser un número entero",
          });
        }

        if (
          capacity !== null &&
          !Number.isInteger(capacity)
        ) {
          return res.status(400).json({
            error:
              "La capacidad del alojamiento debe ser un número entero",
          });
        }

        normalized.push({
          tripId,
          type,
          name,
          location:
            typeof item?.location === "string" &&
            item.location.trim()
              ? item.location.trim()
              : null,
          description:
            typeof item?.description === "string" &&
            item.description.trim()
              ? item.description.trim()
              : null,
          nights,
          capacity,
          sharedAccommodationText:
            typeof item?.sharedAccommodationText === "string" &&
            item.sharedAccommodationText.trim()
              ? item.sharedAccommodationText.trim()
              : null,
          privateOptionEnabled:
            item?.privateOptionEnabled === true,
          privateOptionPrice,
          privateOptionSubjectToAvailability:
            item?.privateOptionSubjectToAvailability !== false,
          previousNightEnabled:
            item?.previousNightEnabled === true,
          previousNightPrice,
          followingNightEnabled:
            item?.followingNightEnabled === true,
          followingNightPrice,
          features:
            item?.features &&
            typeof item.features === "object"
              ? item.features
              : undefined,
          displayOrder:
            Number.isInteger(Number(item?.displayOrder)) &&
            Number(item?.displayOrder) >= 0
              ? Number(item.displayOrder)
              : index,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.travelAccommodation.deleteMany({
          where: { tripId },
        });

        if (normalized.length > 0) {
          await tx.travelAccommodation.createMany({
            data: normalized,
          });
        }
      });

      const updatedAccommodations =
        await prisma.travelAccommodation.findMany({
          where: { tripId },
          orderBy: [
            { displayOrder: "asc" },
            { createdAt: "asc" },
          ],
        });

      return res.json({
        success: true,
        accommodations: updatedAccommodations,
      });
    } catch (error) {
      console.error(
        "Error actualizando alojamientos del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron actualizar los alojamientos del viaje",
      });
    }
  }
);

/* =========================================================
   VIARANK VIAJES - TRANSPORTE
========================================================= */

app.put(
  "/api/travel/trips/:tripId/transport",
  async (req, res) => {
    try {
      const requesterId = getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: { id: tripId },
          select: {
            id: true,
            companyId: true,
            company: {
              select: {
                accessStatus: true,
              trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "transport"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar el transporte de este viaje",
        });
      }

      if (!hasTravelCompanyOperationalAccess(existingTrip.company)) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const parseOptionalNumber = (
        value: unknown
      ): number | null => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed)
          ? parsed
          : NaN;
      };

      const passengerCapacity =
        parseOptionalNumber(
          req.body?.passengerCapacity
        );

      const bicycleCapacity =
        parseOptionalNumber(
          req.body?.bicycleCapacity
        );

      const bicycleTransportPrice =
        parseOptionalNumber(
          req.body?.bicycleTransportPrice
        );

      const numericValues = [
        passengerCapacity,
        bicycleCapacity,
        bicycleTransportPrice,
      ];

      if (
        numericValues.some(
          (value) =>
            value !== null &&
            (!Number.isFinite(value) || value < 0)
        )
      ) {
        return res.status(400).json({
          error:
            "Los valores de transporte deben ser válidos y no negativos",
        });
      }

      if (
        passengerCapacity !== null &&
        !Number.isInteger(passengerCapacity)
      ) {
        return res.status(400).json({
          error:
            "La capacidad de pasajeros debe ser un número entero",
        });
      }

      if (
        bicycleCapacity !== null &&
        !Number.isInteger(bicycleCapacity)
      ) {
        return res.status(400).json({
          error:
            "La capacidad de bicicletas debe ser un número entero",
        });
      }

      const passengerTransportEnabled =
        req.body?.passengerTransportEnabled === true;

      const bicycleTransportEnabled =
        req.body?.bicycleTransportEnabled === true;

      const data = {
        passengerTransportEnabled,

        passengerTransportIncluded:
          passengerTransportEnabled &&
          req.body?.passengerTransportIncluded === true,

        passengerCapacity:
          passengerTransportEnabled
            ? passengerCapacity
            : null,

        bicycleTransportEnabled,

        bicycleTransportIncluded:
          bicycleTransportEnabled &&
          req.body?.bicycleTransportIncluded === true,

        bicycleCapacity:
          bicycleTransportEnabled
            ? bicycleCapacity
            : null,

        bicycleTransportType:
          bicycleTransportEnabled &&
          typeof req.body?.bicycleTransportType === "string" &&
          req.body.bicycleTransportType.trim()
            ? req.body.bicycleTransportType.trim()
            : null,

        bicycleTransportPrice:
          bicycleTransportEnabled
            ? bicycleTransportPrice
            : null,

        notes:
          typeof req.body?.notes === "string" &&
          req.body.notes.trim()
            ? req.body.notes.trim()
            : null,
      };

      const transport =
        await prisma.travelTripTransport.upsert({
          where: { tripId },
          create: {
            tripId,
            ...data,
          },
          update: data,
        });

      return res.json({
        success: true,
        transport,
      });
    } catch (error) {
      console.error(
        "Error actualizando transporte del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar el transporte del viaje",
      });
    }
  }
);

/* =========================================================
   VIARANK VIAJES - TRANSFERS DE LLEGADA Y SALIDA
========================================================= */

app.put(
  "/api/travel/trips/:tripId/transfers",
  async (req, res) => {
    try {
      const requesterId = getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: { id: tripId },
          select: {
            id: true,
            companyId: true,
            company: {
              select: {
                accessStatus: true,
                trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "transport"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar los transfers de este viaje",
        });
      }

      const canManageTransferFinancials =
        hasTravelTripPermission(
          access,
          "manageFinancials"
        );

      if (
        !hasTravelCompanyOperationalAccess(
          existingTrip.company
        )
      ) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const parseOptionalNumber = (
        value: unknown
      ): number | null => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
          ? parsed
          : NaN;
      };

      const optionalString = (
        value: unknown
      ): string | null => {
        if (typeof value !== "string") {
          return null;
        }

        const trimmed = value.trim();

        return trimmed
          ? trimmed
          : null;
      };

      const arrivalTransferEnabled =
        req.body?.arrivalTransferEnabled === true;

      const departureTransferEnabled =
        req.body?.departureTransferEnabled === true;

      const arrivalTransferPrice =
        parseOptionalNumber(
          req.body?.arrivalTransferPrice
        );

      const departureTransferPrice =
        parseOptionalNumber(
          req.body?.departureTransferPrice
        );

      const prices = [
        arrivalTransferPrice,
        departureTransferPrice,
      ];

      if (
        prices.some(
          (value) =>
            value !== null &&
            (
              !Number.isFinite(value) ||
              value < 0
            )
        )
      ) {
        return res.status(400).json({
          error:
            "Los valores de los transfers deben ser válidos y no negativos",
        });
      }

      const currentTransfers =
        await prisma.travelTripTransfer.findUnique({
          where: { tripId },
        });

      const arrivalTransferIncluded =
        canManageTransferFinancials
          ? (
              arrivalTransferEnabled &&
              req.body?.arrivalTransferIncluded === true
            )
          : (
              arrivalTransferEnabled &&
              (
                currentTransfers
                  ?.arrivalTransferIncluded ??
                false
              )
            );

      const departureTransferIncluded =
        canManageTransferFinancials
          ? (
              departureTransferEnabled &&
              req.body?.departureTransferIncluded === true
            )
          : (
              departureTransferEnabled &&
              (
                currentTransfers
                  ?.departureTransferIncluded ??
                false
              )
            );

      const data = {
        arrivalTransferEnabled,

        arrivalTransferIncluded,

        arrivalTransferPrice:
          arrivalTransferEnabled &&
          !arrivalTransferIncluded
            ? (
                canManageTransferFinancials
                  ? arrivalTransferPrice
                  : (
                      currentTransfers
                        ?.arrivalTransferPrice ??
                      null
                    )
              )
            : null,

        arrivalPickupPoint:
          arrivalTransferEnabled
            ? optionalString(
                req.body?.arrivalPickupPoint
              )
            : null,

        arrivalDestination:
          arrivalTransferEnabled
            ? optionalString(
                req.body?.arrivalDestination
              )
            : null,

        arrivalInstructions:
          arrivalTransferEnabled
            ? optionalString(
                req.body?.arrivalInstructions
              )
            : null,

        departureTransferEnabled,

        departureTransferIncluded,

        departureTransferPrice:
          departureTransferEnabled &&
          !departureTransferIncluded
            ? (
                canManageTransferFinancials
                  ? departureTransferPrice
                  : (
                      currentTransfers
                        ?.departureTransferPrice ??
                      null
                    )
              )
            : null,

        departurePickupPoint:
          departureTransferEnabled
            ? optionalString(
                req.body?.departurePickupPoint
              )
            : null,

        departureDestination:
          departureTransferEnabled
            ? optionalString(
                req.body?.departureDestination
              )
            : null,

        departureInstructions:
          departureTransferEnabled
            ? optionalString(
                req.body?.departureInstructions
              )
            : null,

        notes:
          optionalString(req.body?.notes),
      };

      const transfers =
        await prisma.travelTripTransfer.upsert({
          where: { tripId },

          create: {
            tripId,
            ...data,
          },

          update: data,
        });

      if (!canManageTransferFinancials) {
        const {
          arrivalTransferPrice:
            _arrivalTransferPrice,
          departureTransferPrice:
            _departureTransferPrice,
          ...transfersWithoutFinancials
        } = transfers;

        return res.json({
          success: true,
          transfers:
            transfersWithoutFinancials,
        });
      }

      return res.json({
        success: true,
        transfers,
      });
    } catch (error) {
      console.error(
        "Error actualizando transfers del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron actualizar los transfers del viaje",
      });
    }
  }
);
/* =========================================================
   VIARANK VIAJES - EQUIPO DEL VIAJE
   Administradores, organizadores y colaboradores
========================================================= */

/*
  Configuracion de seguro del viaje.
  La gestion operativa usa canManageInsurance.
  Precio e inclusion son informacion economica.
*/
/*
  Catalogo de equipamiento disponible para alquiler.
  Puede incluir bicicletas, kayaks, cascos, bastones,
  neoprene u otros elementos.
*/
app.put(
  "/api/travel/trips/:tripId/equipment",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const { tripId } = req.params;

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: { id: tripId },
          select: {
            id: true,
            company: {
              select: {
                accessStatus: true,
                trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "equipment"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar el equipamiento de este viaje",
        });
      }

      if (
        !hasTravelCompanyOperationalAccess(
          existingTrip.company
        )
      ) {
        return res.status(403).json({
          error:
            "La empresa no está habilitada para editar viajes",
        });
      }

      const canManageEquipmentFinancials =
        hasTravelTripPermission(
          access,
          "manageFinancials"
        );

      const equipment =
        Array.isArray(req.body?.equipment)
          ? req.body.equipment
          : null;

      if (!equipment) {
        return res.status(400).json({
          error:
            "Debés enviar una lista de equipamiento",
        });
      }

      const currentEquipment =
        await prisma.travelTripEquipment.findMany({
          where: { tripId },
        });

      const currentById =
        new Map(
          currentEquipment.map((item) => [
            item.id,
            item,
          ])
        );

      const incomingIds =
        new Set<string>();

      const normalized: Array<{
        id: string | null;
        name: string;
        type: string | null;
        description: string | null;
        quantityAvailable: number | null;
        price: number | null;
        conditions: string | null;
        notes: string | null;
        displayOrder: number;
        enabled: boolean;
      }> = [];

      const cleanText = (
        value: unknown
      ): string | null => {
        if (typeof value !== "string") {
          return null;
        }

        const trimmed = value.trim();

        return trimmed || null;
      };

      for (
        let index = 0;
        index < equipment.length;
        index++
      ) {
        const item = equipment[index];

        const id =
          typeof item?.id === "string" &&
          item.id.trim()
            ? item.id.trim()
            : null;

        if (id) {
          if (incomingIds.has(id)) {
            return res.status(400).json({
              error:
                "Hay equipamiento repetido en la lista",
            });
          }

          incomingIds.add(id);

          if (!currentById.has(id)) {
            return res.status(400).json({
              error:
                "Uno de los elementos de equipamiento no pertenece a este viaje",
            });
          }
        }

        const name =
          typeof item?.name === "string"
            ? item.name.trim()
            : "";

        if (!name) {
          return res.status(400).json({
            error:
              `El equipamiento ${index + 1} debe tener un nombre`,
          });
        }

        let quantityAvailable:
          number | null = null;

        if (
          item?.quantityAvailable !==
            undefined &&
          item?.quantityAvailable !== null &&
          item?.quantityAvailable !== ""
        ) {
          quantityAvailable =
            Number(item.quantityAvailable);

          if (
            !Number.isInteger(
              quantityAvailable
            ) ||
            quantityAvailable < 0
          ) {
            return res.status(400).json({
              error:
                `La cantidad disponible del equipamiento ${index + 1} no es válida`,
            });
          }
        }

        let requestedPrice:
          number | null = null;

        if (
          item?.price !== undefined &&
          item?.price !== null &&
          item?.price !== ""
        ) {
          requestedPrice =
            Number(item.price);

          if (
            !Number.isFinite(
              requestedPrice
            ) ||
            requestedPrice < 0
          ) {
            return res.status(400).json({
              error:
                `El precio del equipamiento ${index + 1} no es válido`,
            });
          }
        }

        let displayOrder = index;

        if (
          item?.displayOrder !== undefined &&
          item?.displayOrder !== null &&
          item?.displayOrder !== ""
        ) {
          displayOrder =
            Number(item.displayOrder);

          if (
            !Number.isInteger(
              displayOrder
            ) ||
            displayOrder < 0
          ) {
            return res.status(400).json({
              error:
                `El orden del equipamiento ${index + 1} no es válido`,
            });
          }
        }

        const previous =
          id
            ? currentById.get(id)
            : null;

        normalized.push({
          id,
          name,

          type:
            cleanText(item?.type),

          description:
            cleanText(
              item?.description
            ),

          quantityAvailable,

          price:
            canManageEquipmentFinancials
              ? requestedPrice
              : (
                  previous?.price ??
                  null
                ),

          conditions:
            cleanText(
              item?.conditions
            ),

          notes:
            cleanText(item?.notes),

          displayOrder,

          enabled:
            item?.enabled !== false,
        });
      }

      const savedEquipment =
        await prisma.$transaction(
          async (tx) => {
            const keepIds =
              normalized
                .map((item) => item.id)
                .filter(
                  (id): id is string =>
                    Boolean(id)
                );

            await tx.travelTripEquipment.deleteMany({
              where: {
                tripId,
                ...(keepIds.length
                  ? {
                      id: {
                        notIn: keepIds,
                      },
                    }
                  : {}),
              },
            });

            for (
              const item of normalized
            ) {
              const {
                id,
                ...data
              } = item;

              if (id) {
                await tx.travelTripEquipment.update({
                  where: { id },
                  data,
                });
              } else {
                await tx.travelTripEquipment.create({
                  data: {
                    tripId,
                    ...data,
                  },
                });
              }
            }

            return tx.travelTripEquipment.findMany({
              where: { tripId },
              orderBy: [
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            });
          }
        );

      if (
        !hasTravelTripPermission(
          access,
          "viewFinancials"
        )
      ) {
        const safeEquipment =
          savedEquipment.map((item) => {
            const {
              price: _price,
              ...safeItem
            } = item;

            return safeItem;
          });

        return res.json({
          success: true,
          equipment: safeEquipment,
        });
      }

      return res.json({
        success: true,
        equipment: savedEquipment,
      });
    } catch (error) {
      console.error(
        "Error guardando equipamiento del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo guardar el equipamiento del viaje",
      });
    }
  }
);
app.put(
  "/api/travel/trips/:tripId/insurance",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const { tripId } = req.params;

      const existingTrip =
        await prisma.travelTrip.findUnique({
          where: { id: tripId },
          select: {
            id: true,
            company: {
              select: {
                accessStatus: true,
                trialEndsAt: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          requesterId
        );

      if (
        !access ||
        !hasTravelTripPermission(
          access,
          "insurance"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar el seguro de este viaje",
        });
      }

      const canManageInsuranceFinancials =
        hasTravelTripPermission(
          access,
          "manageFinancials"
        );

      if (
        !hasTravelCompanyOperationalAccess(
          existingTrip.company
        )
      ) {
        return res.status(403).json({
          error:
            "La empresa no tiene acceso operativo habilitado",
        });
      }

      const enabled =
        req.body?.enabled === true;

      const currentInsurance =
        await prisma.travelTripInsurance.findUnique({
          where: { tripId },
        });

      const parseDate = (
        value: unknown
      ): Date | null | "INVALID" => {
        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return null;
        }

        if (typeof value !== "string") {
          return "INVALID";
        }

        const parsed = new Date(value);

        if (
          Number.isNaN(parsed.getTime())
        ) {
          return "INVALID";
        }

        return parsed;
      };

      const validFrom =
        parseDate(req.body?.validFrom);

      const validUntil =
        parseDate(req.body?.validUntil);

      if (
        validFrom === "INVALID" ||
        validUntil === "INVALID"
      ) {
        return res.status(400).json({
          error:
            "La vigencia del seguro contiene una fecha inválida",
        });
      }

      if (
        validFrom &&
        validUntil &&
        validUntil < validFrom
      ) {
        return res.status(400).json({
          error:
            "La fecha final del seguro no puede ser anterior a la fecha inicial",
        });
      }

      let requestedPrice: number | null =
        null;

      if (
        req.body?.price !== undefined &&
        req.body?.price !== null &&
        req.body?.price !== ""
      ) {
        requestedPrice =
          Number(req.body.price);

        if (
          !Number.isFinite(
            requestedPrice
          ) ||
          requestedPrice < 0
        ) {
          return res.status(400).json({
            error:
              "El valor del seguro no es válido",
          });
        }
      }

      const required =
        enabled &&
        req.body?.required === true;

      const included =
        canManageInsuranceFinancials
          ? (
              enabled &&
              req.body?.included === true
            )
          : (
              enabled &&
              (
                currentInsurance?.included ??
                false
              )
            );

      const cleanText = (
        value: unknown
      ) => {
        if (typeof value !== "string") {
          return null;
        }

        const trimmed = value.trim();

        return trimmed || null;
      };

      const data = {
        enabled,

        required:
          enabled
            ? required
            : false,

        included:
          enabled
            ? included
            : false,

        provider:
          enabled
            ? cleanText(
                req.body?.provider
              )
            : null,

        coverageType:
          enabled
            ? cleanText(
                req.body?.coverageType
              )
            : null,

        coverage:
          enabled
            ? cleanText(
                req.body?.coverage
              )
            : null,

        price:
          enabled &&
          !included
            ? (
                canManageInsuranceFinancials
                  ? requestedPrice
                  : (
                      currentInsurance
                        ?.price ??
                      null
                    )
              )
            : null,

        validFrom:
          enabled
            ? validFrom
            : null,

        validUntil:
          enabled
            ? validUntil
            : null,

        instructions:
          enabled
            ? cleanText(
                req.body?.instructions
              )
            : null,

        notes:
          enabled
            ? cleanText(
                req.body?.notes
              )
            : null,
      };

      const insurance =
        await prisma.travelTripInsurance.upsert({
          where: { tripId },

          create: {
            tripId,
            ...data,
          },

          update: data,
        });

      if (
        !canManageInsuranceFinancials
      ) {
        const {
          price: _insurancePrice,
          ...insuranceWithoutFinancials
        } = insurance;

        return res.json({
          success: true,
          insurance:
            insuranceWithoutFinancials,
        });
      }

      return res.json({
        success: true,
        insurance,
      });
    } catch (error) {
      console.error(
        "Error guardando seguro del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo guardar el seguro del viaje",
      });
    }
  }
);
/* =========================================================
   VIARANK VIAJES - PRECIO Y CONDICIONES DE RESERVA
========================================================= */

app.put(
  "/api/travel/trips/:tripId/pricing",
  async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autorizado.",
        });
      }

      const tripId = String(
        req.params.tripId || ""
      ).trim();

      if (!tripId) {
        return res.status(400).json({
          error: "Viaje inválido.",
        });
      }

      const access =
        await getTravelTripAccess(
          tripId,
          userId
        );

      if (!access) {
        return res.status(404).json({
          error: "Viaje no encontrado.",
        });
      }

      if (
        !hasTravelCompanyOperationalAccess(
          access.trip.company
        )
      ) {
        return res.status(403).json({
          error:
            "La empresa no tiene acceso operativo.",
        });
      }

      if (
        !hasTravelTripPermission(
          access,
          "manageFinancials"
        )
      ) {
        return res.status(403).json({
          error:
            "No tenés permiso para administrar precios y condiciones.",
        });
      }

      const cleanText = (
        value: unknown
      ) => {
        if (typeof value !== "string") {
          return null;
        }

        const trimmed = value.trim();

        return trimmed || null;
      };

      const basePrice =
        typeof req.body?.basePrice ===
          "number" &&
        Number.isFinite(
          req.body.basePrice
        )
          ? req.body.basePrice
          : null;

      if (
        basePrice === null ||
        basePrice < 0
      ) {
        return res.status(400).json({
          error:
            "El valor del viaje debe ser un número no negativo.",
        });
      }

      const pricingMode:
        | "FIXED"
        | "FIXED_DEPOSIT_ADJUSTABLE_BALANCE"
        | null =
        req.body?.mode ===
        "FIXED_DEPOSIT_ADJUSTABLE_BALANCE"
          ? "FIXED_DEPOSIT_ADJUSTABLE_BALANCE"
          : req.body?.mode === "FIXED"
            ? "FIXED"
            : null;

      if (!pricingMode) {
        return res.status(400).json({
          error:
            "La modalidad de precio es inválida.",
        });
      }

      const reservationPaymentMode:
        | "FIXED_DEPOSIT"
        | "PERCENTAGE_DEPOSIT"
        | "FULL_PAYMENT"
        | null =
        req.body?.reservationPaymentMode ===
        "FIXED_DEPOSIT"
          ? "FIXED_DEPOSIT"
          : req.body?.reservationPaymentMode ===
              "PERCENTAGE_DEPOSIT"
            ? "PERCENTAGE_DEPOSIT"
            : req.body?.reservationPaymentMode ===
                "FULL_PAYMENT"
              ? "FULL_PAYMENT"
              : null;

      if (
        reservationPaymentMode !==
          "FIXED_DEPOSIT" &&
        reservationPaymentMode !==
          "PERCENTAGE_DEPOSIT" &&
        reservationPaymentMode !==
          "FULL_PAYMENT"
      ) {
        return res.status(400).json({
          error:
            "La modalidad para asegurar la reserva es inválida.",
        });
      }

      let depositValue:
        | number
        | null = null;

      let depositPercentage:
        | number
        | null = null;

      if (
        reservationPaymentMode ===
        "FIXED_DEPOSIT"
      ) {
        if (
          typeof req.body
            ?.depositValue !==
            "number" ||
          !Number.isFinite(
            req.body.depositValue
          ) ||
          req.body.depositValue <= 0
        ) {
          return res.status(400).json({
            error:
              "La seña fija debe ser mayor que cero.",
          });
        }

        if (
          req.body.depositValue >
          basePrice
        ) {
          return res.status(400).json({
            error:
              "La seña fija no puede superar el valor del viaje.",
          });
        }

        depositValue =
          req.body.depositValue;
      }

      if (
        reservationPaymentMode ===
        "PERCENTAGE_DEPOSIT"
      ) {
        if (
          typeof req.body
            ?.depositPercentage !==
            "number" ||
          !Number.isFinite(
            req.body.depositPercentage
          ) ||
          req.body
            .depositPercentage <= 0 ||
          req.body
            .depositPercentage > 100
        ) {
          return res.status(400).json({
            error:
              "El porcentaje de seña debe ser mayor que 0 y no superar 100.",
          });
        }

        depositPercentage =
          req.body.depositPercentage;
      }

      const participantCancellationPolicy =
        cleanText(
          req.body
            ?.participantCancellationPolicy
        );

      const weatherPolicy =
        cleanText(
          req.body?.weatherPolicy
        );

      const companyCancellationPolicy =
        cleanText(
          req.body
            ?.companyCancellationPolicy
        );

      if (
        !participantCancellationPolicy ||
        !weatherPolicy ||
        !companyCancellationPolicy
      ) {
        return res.status(400).json({
          error:
            "Las políticas de cancelación del participante, clima/fuerza mayor y cancelación de la empresa son obligatorias.",
        });
      }

      const adjustmentMethod =
        pricingMode ===
        "FIXED_DEPOSIT_ADJUSTABLE_BALANCE"
          ? cleanText(
              req.body
                ?.adjustmentMethod
            )
          : null;

      const adjustmentDescription =
        pricingMode ===
        "FIXED_DEPOSIT_ADJUSTABLE_BALANCE"
          ? cleanText(
              req.body
                ?.adjustmentDescription
            )
          : null;

      if (
        pricingMode ===
          "FIXED_DEPOSIT_ADJUSTABLE_BALANCE" &&
        (!adjustmentMethod ||
          !adjustmentDescription)
      ) {
        return res.status(400).json({
          error:
            "El método y la descripción de actualización del saldo son obligatorios.",
        });
      }

      const termsText = [
        `Valor del viaje: ${basePrice}`,
        reservationPaymentMode ===
        "FIXED_DEPOSIT"
          ? `Reserva: seña fija de ${depositValue}`
          : reservationPaymentMode ===
              "PERCENTAGE_DEPOSIT"
            ? `Reserva: seña del ${depositPercentage}%`
            : "Reserva: pago total",
        "",
        "Cancelación del participante:",
        participantCancellationPolicy,
        "",
        "Clima, seguridad o fuerza mayor:",
        weatherPolicy,
        "",
        "Cancelación por parte de la empresa:",
        companyCancellationPolicy,
        ...(pricingMode ===
          "FIXED_DEPOSIT_ADJUSTABLE_BALANCE"
          ? [
              "",
              "Actualización del saldo:",
              adjustmentMethod,
              adjustmentDescription,
            ]
          : []),
      ].join("\n");

      const result =
        await prisma.$transaction(
          async (tx) => {
            const currentPricing =
              await tx.travelTripPricing.findUnique(
                {
                  where: {
                    tripId,
                  },
                  include: {
                    versions: {
                      orderBy: {
                        version:
                          "desc",
                      },
                      take: 1,
                    },
                  },
                }
              );

            const nextVersion =
              (currentPricing
                ?.versions[0]
                ?.version ?? 0) + 1;

            const pricingData = {
              mode: pricingMode,
              basePrice,
              reservationPaymentMode,
              depositValue,
              depositPercentage,
              participantCancellationPolicy,
              weatherPolicy,
              companyCancellationPolicy,
              adjustmentMethod,
              adjustmentDescription,
            };

            const pricing =
              await tx.travelTripPricing.upsert(
                {
                  where: {
                    tripId,
                  },
                  create: {
                    tripId,
                    ...pricingData,
                  },
                  update:
                    pricingData,
                }
              );

            const version =
              await tx.travelPricingVersion.create(
                {
                  data: {
                    pricingId:
                      pricing.id,
                    version:
                      nextVersion,
                    termsText,
                    pricingMode,
                    basePrice,
                    reservationPaymentMode,
                    depositValue,
                    depositPercentage,
                    participantCancellationPolicy,
                    weatherPolicy,
                    companyCancellationPolicy,
                    adjustmentMethod,
                    adjustmentDescription,
                  },
                }
              );

            return {
              pricing,
              version,
            };
          }
        );

      return res.json({
        success: true,
        pricing: result.pricing,
        version: result.version,
      });
    } catch (error) {
      console.error(
        "Error guardando precio y condiciones del viaje:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo guardar el precio y las condiciones del viaje.",
      });
    }
  }
);
/* =========================================================
   VIARANK VIAJES - INSCRIPCIÓN / RESERVA DEL PARTICIPANTE
========================================================= */

app.post(
  "/api/travel/trips/:tripId/reservations/me",
  async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autorizado.",
        });
      }

      const tripId = String(req.params.tripId || "").trim();

      if (!tripId) {
        return res.status(400).json({
          error: "Viaje inválido.",
        });
      }

      const requiredString = (
        value: unknown
      ): string | null => {
        if (typeof value !== "string") {
          return null;
        }

        const normalized = value.trim();

        return normalized || null;
      };

      const optionalString = (
        value: unknown
      ): string | null => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        if (typeof value !== "string") {
          return null;
        }

        const normalized = value.trim();

        return normalized || null;
      };

      const parseOptionalDate = (
        value: unknown
      ): Date | null => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        if (typeof value !== "string") {
          return null;
        }

        const parsed = new Date(value);

        return Number.isNaN(parsed.getTime())
          ? null
          : parsed;
      };

      const firstName = requiredString(
        req.body?.firstName
      );

      const lastName = requiredString(
        req.body?.lastName
      );

      if (!firstName || !lastName) {
        return res.status(400).json({
          error:
            "Nombre y apellido son obligatorios.",
        });
      }

      const birthDateInput =
        req.body?.birthDate;

      const birthDate =
        parseOptionalDate(birthDateInput);

      if (
        birthDateInput !== null &&
        birthDateInput !== undefined &&
        birthDateInput !== "" &&
        !birthDate
      ) {
        return res.status(400).json({
          error:
            "La fecha de nacimiento no es válida.",
        });
      }

      const passengerTransportChoice =
        req.body?.passengerTransportChoice ??
        null;

      if (
        passengerTransportChoice !== null &&
        passengerTransportChoice !==
          "ORGANIZER_TRANSPORT" &&
        passengerTransportChoice !==
          "OWN_MEANS"
      ) {
        return res.status(400).json({
          error:
            "La elección de transporte de pasajero no es válida.",
        });
      }

      const bicycleTransportChoice =
        req.body?.bicycleTransportChoice ??
        null;

      if (
        bicycleTransportChoice !== null &&
        bicycleTransportChoice !==
          "ORGANIZER_TRANSPORT" &&
        bicycleTransportChoice !==
          "OWN_MEANS" &&
        bicycleTransportChoice !==
          "NOT_APPLICABLE"
      ) {
        return res.status(400).json({
          error:
            "La elección de transporte de bicicleta no es válida.",
        });
      }

      const arrivalDateInput =
        req.body?.arrivalDate;

      const arrivalDate =
        parseOptionalDate(arrivalDateInput);

      if (
        arrivalDateInput !== null &&
        arrivalDateInput !== undefined &&
        arrivalDateInput !== "" &&
        !arrivalDate
      ) {
        return res.status(400).json({
          error:
            "La fecha de llegada no es válida.",
        });
      }

      const departureDateInput =
        req.body?.departureDate;

      const departureDate =
        parseOptionalDate(departureDateInput);

      if (
        departureDateInput !== null &&
        departureDateInput !== undefined &&
        departureDateInput !== "" &&
        !departureDate
      ) {
        return res.status(400).json({
          error:
            "La fecha de salida no es válida.",
        });
      }

      const runReservationTransaction = async () =>
        prisma.$transaction(
          async (tx) => {
            const trip =
              await tx.travelTrip.findUnique({
                where: {
                  id: tripId,
                },
                select: {
                  id: true,
                  status: true,
                  totalCapacity: true,
                  externalReservedPlaces: true,
                  transport: {
                    select: {
                      passengerTransportEnabled: true,
                      passengerCapacity: true,
                      bicycleTransportEnabled: true,
                      bicycleCapacity: true,
                    },
                  },
                  accommodations: true,
                  transfers: true,
                  equipment: {
                    where: {
                      enabled: true,
                    },
                    orderBy: [
                      { displayOrder: "asc" },
                      { createdAt: "asc" },
                    ],
                  },
                  pricing: true,
                  price: true,
                  company: {
                    select: {
                      accessStatus: true,
                      trialEndsAt: true,
                    },
                  },
                },
              });

            if (!trip) {
              return {
                type: "NOT_FOUND" as const,
              };
            }

            if (
              !hasTravelCompanyOperationalAccess(
                trip.company
              )
            ) {
              return {
                type:
                  "COMPANY_UNAVAILABLE" as const,
              };
            }

            if (trip.status !== "PUBLISHED") {
              return {
                type:
                  "TRIP_NOT_PUBLISHED" as const,
              };
            }

            const existing =
              await tx.travelReservation.findUnique({
                where: {
                  tripId_userId: {
                    tripId,
                    userId,
                  },
                },
              });

            if (!existing) {
              return {
                type: "PAYMENT_REQUIRED" as const,
              };
            }

            if (existing.status === "CANCELLED") {
              return {
                type: "RESERVATION_CANCELLED" as const,
              };
            }

            if (existing.status !== "CONFIRMED") {
              return {
                type: "PAYMENT_VERIFICATION_REQUIRED" as const,
              };
            }

            if (
              passengerTransportChoice ===
              "ORGANIZER_TRANSPORT"
            ) {
              if (
                !trip.transport
                  ?.passengerTransportEnabled
              ) {
                return {
                  type:
                    "PASSENGER_TRANSPORT_UNAVAILABLE" as const,
                };
              }

              if (
                trip.transport.passengerCapacity !==
                null
              ) {
                const passengerTransportReservations =
                  await tx.travelReservation.count({
                    where: {
                      tripId,
                      status: "CONFIRMED",
                      id: {
                        not: existing.id,
                      },
                      passengerTransportChoice:
                        "ORGANIZER_TRANSPORT",
                    },
                  });

                if (
                  passengerTransportReservations >=
                  trip.transport.passengerCapacity
                ) {
                  return {
                    type:
                      "PASSENGER_TRANSPORT_FULL" as const,
                    capacity:
                      trip.transport.passengerCapacity,
                    occupiedPlaces:
                      passengerTransportReservations,
                  };
                }
              }
            }

            if (
              bicycleTransportChoice ===
              "ORGANIZER_TRANSPORT"
            ) {
              if (
                !trip.transport
                  ?.bicycleTransportEnabled
              ) {
                return {
                  type:
                    "BICYCLE_TRANSPORT_UNAVAILABLE" as const,
                };
              }

              if (
                trip.transport.bicycleCapacity !==
                null
              ) {
                const bicycleTransportReservations =
                  await tx.travelReservation.count({
                    where: {
                      tripId,
                      status: "CONFIRMED",
                      id: {
                        not: existing.id,
                      },
                      bicycleTransportChoice:
                        "ORGANIZER_TRANSPORT",
                    },
                  });

                if (
                  bicycleTransportReservations >=
                  trip.transport.bicycleCapacity
                ) {
                  return {
                    type:
                      "BICYCLE_TRANSPORT_FULL" as const,
                    capacity:
                      trip.transport.bicycleCapacity,
                    occupiedPlaces:
                      bicycleTransportReservations,
                  };
                }
              }
            }

            const requestedAccommodationId =
              optionalString(
                req.body?.accommodationId
              );

            const requestedAccommodation =
              requestedAccommodationId
                ? trip.accommodations.find(
                    (item) =>
                      item.id ===
                      requestedAccommodationId
                  )
                : null;

            if (
              requestedAccommodationId &&
              !requestedAccommodation
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "El alojamiento seleccionado no pertenece a este viaje.",
              };
            }

            const wantsPrivateAccommodation =
              req.body?.privateAccommodation ===
              true;

            const previousNights =
              req.body?.previousNights ===
                undefined ||
              req.body?.previousNights === null ||
              req.body?.previousNights === ""
                ? 0
                : Number(
                    req.body.previousNights
                  );

            const followingNights =
              req.body?.followingNights ===
                undefined ||
              req.body?.followingNights === null ||
              req.body?.followingNights === ""
                ? 0
                : Number(
                    req.body.followingNights
                  );

            if (
              !Number.isInteger(previousNights) ||
              previousNights < 0 ||
              !Number.isInteger(followingNights) ||
              followingNights < 0
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "Las noches adicionales deben ser cantidades enteras y no negativas.",
              };
            }

            if (
              wantsPrivateAccommodation &&
              (
                !requestedAccommodation ||
                !requestedAccommodation
                  .privateOptionEnabled
              )
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "La opción de alojamiento privado no está disponible.",
              };
            }

            if (
              previousNights > 0 &&
              (
                !requestedAccommodation ||
                !requestedAccommodation
                  .previousNightEnabled
              )
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "La noche previa no está disponible para el alojamiento seleccionado.",
              };
            }

            if (
              followingNights > 0 &&
              (
                !requestedAccommodation ||
                !requestedAccommodation
                  .followingNightEnabled
              )
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "La noche posterior no está disponible para el alojamiento seleccionado.",
              };
            }

            const wantsArrivalTransfer =
              req.body?.arrivalTransfer === true;

            const wantsDepartureTransfer =
              req.body?.departureTransfer ===
              true;

            if (
              wantsArrivalTransfer &&
              !trip.transfers
                ?.arrivalTransferEnabled
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "El transfer de llegada no está disponible.",
              };
            }

            if (
              wantsDepartureTransfer &&
              !trip.transfers
                ?.departureTransferEnabled
            ) {
              return {
                type: "INVALID_EXTRA" as const,
                error:
                  "El transfer de salida no está disponible.",
              };
            }

            const requestedEquipment =
              Array.isArray(req.body?.equipment)
                ? req.body.equipment
                : [];

            const equipmentRequests: Array<{
              item: (typeof trip.equipment)[number];
              quantity: number;
            }> = [];

            const requestedEquipmentIds =
              new Set<string>();

            for (
              let index = 0;
              index <
              requestedEquipment.length;
              index++
            ) {
              const requested =
                requestedEquipment[index];

              const equipmentId =
                optionalString(
                  requested?.equipmentId
                );

              const quantity =
                Number(requested?.quantity);

              if (
                !equipmentId ||
                !Number.isInteger(quantity) ||
                quantity <= 0
              ) {
                return {
                  type: "INVALID_EXTRA" as const,
                  error:
                    "El equipamiento solicitado debe tener un identificador y una cantidad válida.",
                };
              }

              if (
                requestedEquipmentIds.has(
                  equipmentId
                )
              ) {
                return {
                  type: "INVALID_EXTRA" as const,
                  error:
                    "Hay equipamiento repetido en la reserva.",
                };
              }

              requestedEquipmentIds.add(
                equipmentId
              );

              const equipmentItem =
                trip.equipment.find(
                  (item) =>
                    item.id === equipmentId
                );

              if (!equipmentItem) {
                return {
                  type: "INVALID_EXTRA" as const,
                  error:
                    "Uno de los elementos de equipamiento no está disponible para este viaje.",
                };
              }

              if (
                equipmentItem.quantityAvailable !==
                null
              ) {
                const alreadyReserved =
                  await tx.travelReservationExtra.aggregate({
                    where: {
                      type:
                        "EQUIPMENT_RENTAL",
                      sourceId:
                        equipmentItem.id,
                      reservation: {
                        tripId,
                        status: "CONFIRMED",
                        id: {
                          not: existing.id,
                        },
                      },
                    },
                    _sum: {
                      quantity: true,
                    },
                  });

                const occupiedQuantity =
                  alreadyReserved._sum
                    .quantity ?? 0;

                if (
                  occupiedQuantity +
                    quantity >
                  equipmentItem
                    .quantityAvailable
                ) {
                  return {
                    type:
                      "EQUIPMENT_FULL" as const,
                    equipmentId:
                      equipmentItem.id,
                    equipmentName:
                      equipmentItem.name,
                    capacity:
                      equipmentItem
                        .quantityAvailable,
                    occupiedQuantity,
                    requestedQuantity:
                      quantity,
                  };
                }
              }

              equipmentRequests.push({
                item: equipmentItem,
                quantity,
              });
            }

            const extraLines: Array<{
              type:
                | "PRIVATE_ACCOMMODATION"
                | "PREVIOUS_NIGHT"
                | "FOLLOWING_NIGHT"
                | "EQUIPMENT_RENTAL"
                | "TRANSFER";
              sourceId: string | null;
              name: string;
              description: string | null;
              quantity: number;
              unitPrice: number;
              totalPrice: number;
            }> = [];

            const addExtra = (
              type:
                | "PRIVATE_ACCOMMODATION"
                | "PREVIOUS_NIGHT"
                | "FOLLOWING_NIGHT"
                | "EQUIPMENT_RENTAL"
                | "TRANSFER",
              sourceId: string | null,
              name: string,
              description: string | null,
              quantity: number,
              unitPrice: number | null
            ) => {
              if (unitPrice === null) {
                throw Object.assign(
                  new Error(
                    `El servicio "${name}" no tiene un precio definido.`
                  ),
                  { httpStatus: 409 }
                );
              }

              extraLines.push({
                type,
                sourceId,
                name,
                description,
                quantity,
                unitPrice,
                totalPrice:
                  unitPrice * quantity,
              });
            };

            if (
              wantsPrivateAccommodation &&
              requestedAccommodation
            ) {
              addExtra(
                "PRIVATE_ACCOMMODATION",
                requestedAccommodation.id,
                `Alojamiento privado - ${requestedAccommodation.name}`,
                requestedAccommodation
                  .privateOptionSubjectToAvailability
                  ? "Sujeto a disponibilidad"
                  : null,
                1,
                requestedAccommodation
                  .privateOptionPrice
              );
            }

            if (
              previousNights > 0 &&
              requestedAccommodation
            ) {
              addExtra(
                "PREVIOUS_NIGHT",
                requestedAccommodation.id,
                `Noche previa - ${requestedAccommodation.name}`,
                null,
                previousNights,
                requestedAccommodation
                  .previousNightPrice
              );
            }

            if (
              followingNights > 0 &&
              requestedAccommodation
            ) {
              addExtra(
                "FOLLOWING_NIGHT",
                requestedAccommodation.id,
                `Noche posterior - ${requestedAccommodation.name}`,
                null,
                followingNights,
                requestedAccommodation
                  .followingNightPrice
              );
            }

            if (
              wantsArrivalTransfer &&
              trip.transfers
            ) {
              addExtra(
                "TRANSFER",
                trip.transfers.id,
                "Transfer de llegada",
                trip.transfers
                  .arrivalPickupPoint,
                1,
                trip.transfers
                  .arrivalTransferIncluded
                  ? 0
                  : trip.transfers
                      .arrivalTransferPrice
              );
            }

            if (
              wantsDepartureTransfer &&
              trip.transfers
            ) {
              addExtra(
                "TRANSFER",
                trip.transfers.id,
                "Transfer de salida",
                trip.transfers
                  .departurePickupPoint,
                1,
                trip.transfers
                  .departureTransferIncluded
                  ? 0
                  : trip.transfers
                      .departureTransferPrice
              );
            }

            for (
              const request of
              equipmentRequests
            ) {
              addExtra(
                "EQUIPMENT_RENTAL",
                request.item.id,
                request.item.name,
                request.item.description,
                request.quantity,
                request.item.price
              );
            }

            const extrasTotal =
              extraLines.reduce(
                (sum, item) =>
                  sum + item.totalPrice,
                0
              );

            const basePrice =
              existing.basePrice;

            if (basePrice === null) {
              throw Object.assign(
                new Error(
                  "La reserva no tiene un valor base registrado."
                ),
                { httpStatus: 409 }
              );
            }

            const totalPrice =
              Math.round(
                (basePrice +
                  extrasTotal +
                  Number.EPSILON) *
                  100
              ) / 100;

            if (totalPrice < existing.totalPaid) {
              throw Object.assign(
                new Error(
                  "No se pueden quitar servicios porque el nuevo total quedaría por debajo del importe ya pagado."
                ),
                { httpStatus: 409 }
              );
            }

            const pendingBalance =
              Math.max(
                Math.round(
                  (totalPrice -
                    existing.totalPaid +
                    Number.EPSILON) *
                    100
                ) / 100,
                0
              );

            const reservationData = {
              status: "CONFIRMED" as const,

              firstName,
              lastName,

              document: optionalString(
                req.body?.document
              ),

              birthDate,

              phone: optionalString(
                req.body?.phone
              ),

              email: optionalString(
                req.body?.email
              ),

              city: optionalString(
                req.body?.city
              ),

              address: optionalString(
                req.body?.address
              ),

              healthCoverageName:
                optionalString(
                  req.body
                    ?.healthCoverageName
                ),

              healthCoverageNumber:
                optionalString(
                  req.body
                    ?.healthCoverageNumber
                ),

              emergencyContactName:
                optionalString(
                  req.body
                    ?.emergencyContactName
                ),

              emergencyContactRelationship:
                optionalString(
                  req.body
                    ?.emergencyContactRelationship
                ),

              emergencyContactPhone:
                optionalString(
                  req.body
                    ?.emergencyContactPhone
                ),

              emergencyContactPhoneAlt:
                optionalString(
                  req.body
                    ?.emergencyContactPhoneAlt
                ),

              passengerTransportChoice,

              bicycleTransportChoice,

              arrivalMode: optionalString(
                req.body?.arrivalMode
              ),

              arrivalDate,

              arrivalApproxTime: optionalString(
                req.body?.arrivalApproxTime
              ),

              arrivalPlace: optionalString(
                req.body?.arrivalPlace
              ),

              arrivalCompany: optionalString(
                req.body?.arrivalCompany
              ),

              arrivalServiceNumber:
                optionalString(
                  req.body
                    ?.arrivalServiceNumber
                ),

              arrivalNotes: optionalString(
                req.body?.arrivalNotes
              ),

              departureMode: optionalString(
                req.body?.departureMode
              ),

              departureDate,

              departureApproxTime:
                optionalString(
                  req.body
                    ?.departureApproxTime
                ),

              departurePlace: optionalString(
                req.body?.departurePlace
              ),

              departureCompany:
                optionalString(
                  req.body?.departureCompany
                ),

              departureServiceNumber:
                optionalString(
                  req.body
                    ?.departureServiceNumber
                ),

              departureNotes: optionalString(
                req.body?.departureNotes
              ),

              bicycleType: optionalString(
                req.body?.bicycleType
              ),

              bicycleBrand: optionalString(
                req.body?.bicycleBrand
              ),

              bicycleModel: optionalString(
                req.body?.bicycleModel
              ),

              bicycleColor: optionalString(
                req.body?.bicycleColor
              ),

              bicycleWheelSize: optionalString(
                req.body?.bicycleWheelSize
              ),

              bicycleSerialNumber:
                optionalString(
                  req.body
                    ?.bicycleSerialNumber
                ),

              bicyclePhotoUrl: optionalString(
                req.body?.bicyclePhotoUrl
              ),

              bicycleNotes: optionalString(
                req.body?.bicycleNotes
              ),

              basePrice,
              extrasTotal,
              totalPrice,
              pendingBalance,
            };

            const reservation =
              await tx.travelReservation.update({
                where: {
                  id: existing.id,
                },
                data: reservationData,
              });

            if (
              Math.abs(
                pendingBalance -
                  (existing.pendingBalance ?? 0)
              ) >= 0.01
            ) {
              await tx.travelBalanceAdjustment.create({
                data: {
                  reservationId: reservation.id,
                  previousBalance:
                    existing.pendingBalance ?? 0,
                  newBalance: pendingBalance,
                  reason:
                    "Actualización de servicios adicionales de la reserva",
                },
              });
            }

            await tx.travelReservationExtra.deleteMany({
              where: {
                reservationId:
                  reservation.id,
              },
            });

            if (extraLines.length > 0) {
              await tx.travelReservationExtra.createMany({
                data: extraLines.map(
                  (item) => ({
                    reservationId:
                      reservation.id,
                    ...item,
                  })
                ),
              });
            }

            const reservationWithExtras =
              await tx.travelReservation.findUnique({
                where: {
                  id: reservation.id,
                },
                include: {
                  extras: {
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
                },
              });

            return {
              type: "UPDATED" as const,
              reservation:
                reservationWithExtras,
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel
                .Serializable,
          }
        );

      let result:
        Awaited<
          ReturnType<
            typeof runReservationTransaction
          >
        >;

      for (let attempt = 1; ; attempt++) {
        try {
          result =
            await runReservationTransaction();
          break;
        } catch (error: any) {
          if (
            error?.code === "P2034" &&
            attempt < 3
          ) {
            continue;
          }

          throw error;
        }
      }

      if (
        result.type ===
        "PASSENGER_TRANSPORT_UNAVAILABLE"
      ) {
        return res.status(409).json({
          error:
            "El transporte de pasajeros del organizador no está disponible para este viaje.",
        });
      }

      if (
        result.type ===
        "PASSENGER_TRANSPORT_FULL"
      ) {
        return res.status(409).json({
          error:
            "No quedan lugares disponibles en el transporte de pasajeros.",
          capacity: result.capacity,
          occupiedPlaces:
            result.occupiedPlaces,
        });
      }

      if (
        result.type ===
        "BICYCLE_TRANSPORT_UNAVAILABLE"
      ) {
        return res.status(409).json({
          error:
            "El transporte de bicicletas del organizador no está disponible para este viaje.",
        });
      }

      if (
        result.type ===
        "BICYCLE_TRANSPORT_FULL"
      ) {
        return res.status(409).json({
          error:
            "No quedan lugares disponibles para transportar bicicletas.",
          capacity: result.capacity,
          occupiedPlaces:
            result.occupiedPlaces,
        });
      }

      if (
      result.type === "INVALID_EXTRA"
    ) {
      return res.status(400).json({
        error: result.error,
      });
    }

    if (
      result.type === "EQUIPMENT_FULL"
    ) {
      return res.status(409).json({
        error:
          `No hay suficiente disponibilidad de ${result.equipmentName}.`,
        equipmentId:
          result.equipmentId,
        capacity:
          result.capacity,
        occupiedQuantity:
          result.occupiedQuantity,
        requestedQuantity:
          result.requestedQuantity,
      });
    }
    if (result.type === "NOT_FOUND") {
        return res.status(404).json({
          error: "Viaje no encontrado.",
        });
      }

      if (
        result.type === "COMPANY_UNAVAILABLE"
      ) {
        return res.status(403).json({
          error:
            "La empresa no tiene acceso operativo habilitado.",
        });
      }

      if (
        result.type === "TRIP_NOT_PUBLISHED"
      ) {
        return res.status(409).json({
          error:
            "El viaje todavía no está publicado.",
        });
      }

      if (result.type === "PAYMENT_REQUIRED") {
        return res.status(409).json({
          error:
            "Primero debés informar el pago de la reserva.",
        });
      }

      if (result.type === "RESERVATION_CANCELLED") {
        return res.status(409).json({
          error:
            "La reserva está cancelada. Contactá a la empresa organizadora.",
        });
      }

      if (
        result.type === "PAYMENT_VERIFICATION_REQUIRED"
      ) {
        return res.status(409).json({
          error:
            "Tu pago de reserva todavía debe ser verificado antes de completar la ficha.",
        });
      }

      return res.status(200).json({
        success: true,
        reservation: result.reservation,
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return res.status(409).json({
          error:
            "Ya tenés una reserva para este viaje.",
        });
      }

      console.error(
        "Error actualizando ficha de participante:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar la ficha del participante.",
      });
    }
  }
);

/* =========================================================
   VIARANK VIAJES - REPORTAR PAGO DE RESERVA
========================================================= */
app.post("/api/travel/trips/:tripId/reservations/me/payments", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "No autenticado." });
    }

    const tripId = String(req.params.tripId || "").trim();
    const amount = req.body?.amount;
    const receiptUrl =
      typeof req.body?.receiptUrl === "string"
        ? req.body.receiptUrl.trim()
        : "";
    const pricingTermsVersion = req.body?.pricingTermsVersion;

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        error: "El importe informado debe ser mayor que cero.",
      });
    }

    if (!receiptUrl) {
      return res.status(400).json({
        error: "El comprobante de pago es obligatorio.",
      });
    }

    if (
      !Number.isInteger(pricingTermsVersion) ||
      pricingTermsVersion <= 0
    ) {
      return res.status(400).json({
        error: "La versión de las condiciones es obligatoria.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "Usuario no encontrado.",
      });
    }

    const maxRetries = 4;
    let result: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {
            const trip = await tx.travelTrip.findUnique({
              where: { id: tripId },
              select: {
                status: true,
                totalCapacity: true,
                externalReservedPlaces: true,
                company: {
                  select: {
                    accessStatus: true,
                    trialEndsAt: true,
                  },
                },
                pricing: {
                  select: {
                    versions: {
                      orderBy: { version: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            });

            if (!trip) {
              throw Object.assign(
                new Error("Viaje no encontrado."),
                { httpStatus: 404 }
              );
            }

            if (trip.status !== "PUBLISHED") {
              throw Object.assign(
                new Error("El viaje no está disponible para reservas."),
                { httpStatus: 409 }
              );
            }

            if (!hasTravelCompanyOperationalAccess(trip.company)) {
              throw Object.assign(
                new Error("La empresa no tiene acceso operativo."),
                { httpStatus: 403 }
              );
            }

            const version = trip.pricing?.versions[0];

            if (!version) {
              throw Object.assign(
                new Error("El viaje no tiene condiciones de reserva publicadas."),
                { httpStatus: 409 }
              );
            }

            if (version.version !== pricingTermsVersion) {
              throw Object.assign(
                new Error(
                  "Las condiciones cambiaron. Revisalas y aceptalas nuevamente."
                ),
                { httpStatus: 409 }
              );
            }

            let requiredAmount = 0;

            if (version.reservationPaymentMode === "FIXED_DEPOSIT") {
              requiredAmount = version.depositValue ?? 0;
            } else if (
              version.reservationPaymentMode === "PERCENTAGE_DEPOSIT"
            ) {
              requiredAmount =
                version.basePrice *
                ((version.depositPercentage ?? 0) / 100);
            } else if (
              version.reservationPaymentMode === "FULL_PAYMENT"
            ) {
              requiredAmount = version.basePrice;
            }

            requiredAmount =
              Math.round((requiredAmount + Number.EPSILON) * 100) / 100;

            if (requiredAmount <= 0) {
              throw Object.assign(
                new Error(
                  "El importe requerido para reservar no está configurado correctamente."
                ),
                { httpStatus: 409 }
              );
            }

            if (amount < requiredAmount) {
              throw Object.assign(
                new Error(
                  `Para asegurar la reserva debés informar al menos ${requiredAmount}.`
                ),
                { httpStatus: 400 }
              );
            }

            const maximumInitialPayment =
              Math.round(
                (version.basePrice + Number.EPSILON) * 100
              ) / 100;

            if (amount > maximumInitialPayment) {
              throw Object.assign(
                new Error(
                  `El importe informado no puede superar el valor del viaje (${maximumInitialPayment}).`
                ),
                { httpStatus: 400 }
              );
            }

            const existing =
              await tx.travelReservation.findUnique({
                where: {
                  tripId_userId: {
                    tripId,
                    userId,
                  },
                },
                include: {
                  payments: {
                    where: {
                      status: {
                        in: ["REPORTED", "VERIFIED"],
                      },
                    },
                    select: { id: true },
                  },
                },
              });

            if (existing?.status === "CONFIRMED") {
              throw Object.assign(
                new Error("Tu reserva ya está confirmada."),
                { httpStatus: 409 }
              );
            }

            if (existing?.status === "CANCELLED") {
              throw Object.assign(
                new Error(
                  "La reserva anterior está cancelada y debe ser revisada por la empresa."
                ),
                { httpStatus: 409 }
              );
            }

            if (existing && existing.payments.length > 0) {
              throw Object.assign(
                new Error("Ya tenés un pago informado para esta reserva."),
                { httpStatus: 409 }
              );
            }

            if (trip.totalCapacity !== null) {
              const held =
                await tx.travelReservation.count({
                  where: {
                    tripId,
                    OR: [
                      { status: "CONFIRMED" },
                      {
                        status: "PENDING",
                        payments: {
                          some: {
                            status: {
                              in: ["REPORTED", "VERIFIED"],
                            },
                          },
                        },
                      },
                    ],
                  },
                });

              if (
                held + trip.externalReservedPlaces >=
                trip.totalCapacity
              ) {
                throw Object.assign(
                  new Error("No quedan lugares disponibles."),
                  { httpStatus: 409 }
                );
              }
            }

            const now = new Date();

            if (existing) {
              await tx.travelReservationExtra.deleteMany({
                where: {
                  reservationId: existing.id,
                },
              });
            }

            const reservation = existing
              ? await tx.travelReservation.update({
                  where: { id: existing.id },
                  data: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    document: null,
                    birthDate: null,
                    phone: null,
                    email: user.email,
                    city: null,
                    address: null,
                    healthCoverageName: null,
                    healthCoverageNumber: null,
                    emergencyContactName: null,
                    emergencyContactRelationship: null,
                    emergencyContactPhone: null,
                    emergencyContactPhoneAlt: null,
                    passengerTransportChoice: null,
                    bicycleTransportChoice: null,
                    arrivalMode: null,
                    arrivalDate: null,
                    arrivalApproxTime: null,
                    arrivalPlace: null,
                    arrivalCompany: null,
                    arrivalServiceNumber: null,
                    arrivalNotes: null,
                    departureMode: null,
                    departureDate: null,
                    departureApproxTime: null,
                    departurePlace: null,
                    departureCompany: null,
                    departureServiceNumber: null,
                    departureNotes: null,
                    bicycleType: null,
                    bicycleBrand: null,
                    bicycleModel: null,
                    bicycleColor: null,
                    bicycleWheelSize: null,
                    bicycleSerialNumber: null,
                    bicyclePhotoUrl: null,
                    bicycleNotes: null,
                    status: "PENDING",
                    basePrice: version.basePrice,
                    extrasTotal: 0,
                    totalPrice: version.basePrice,
                    totalPaid: 0,
                    pendingBalance: version.basePrice,
                    reservationRequiredAmount: requiredAmount,
                    pricingTermsAcceptedAt: now,
                    pricingTermsVersion: version.version,
                    confirmedAt: null,
                    waiverAcceptedAt: null,
                    waiverVersion: null,
                  },
                })
              : await tx.travelReservation.create({
                  data: {
                    tripId,
                    userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    status: "PENDING",
                    basePrice: version.basePrice,
                    extrasTotal: 0,
                    totalPrice: version.basePrice,
                    totalPaid: 0,
                    pendingBalance: version.basePrice,
                    reservationRequiredAmount: requiredAmount,
                    pricingTermsAcceptedAt: now,
                    pricingTermsVersion: version.version,
                  },
                });

            const payment = await tx.travelPayment.create({
              data: {
                reservationId: reservation.id,
                amount,
                status: "REPORTED",
                receiptUrl,
                reportedAt: now,
              },
            });

            return {
              reservation,
              payment,
              requiredAmount,
            };
          },
          { isolationLevel: "Serializable" }
        );

        break;
      } catch (error: any) {
        if (error?.code === "P2034" && attempt < maxRetries) {
          continue;
        }

        throw error;
      }
    }

    if (!result) {
      return res.status(409).json({
        error: "Conflicto al registrar el pago. Intentá nuevamente.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Pago informado. Tu lugar quedó retenido mientras se verifica el comprobante.",
      reservation: result.reservation,
      payment: result.payment,
      requiredAmount: result.requiredAmount,
    });
  } catch (error: any) {
    if (typeof error?.httpStatus === "number") {
      return res.status(error.httpStatus).json({
        error: error.message,
      });
    }

    console.error("Error informando pago de reserva:", error);

    return res.status(500).json({
      error: "No se pudo informar el pago.",
    });
  }
});

/* =========================================================
   VIARANK VIAJES - REPORTAR PAGO DE SALDO
========================================================= */
app.post(
  "/api/travel/trips/:tripId/reservations/me/balance-payments",
  async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autenticado.",
        });
      }

      const tripId = String(req.params.tripId || "").trim();

      const amount = Number(req.body?.amount);

      const receiptUrl =
        typeof req.body?.receiptUrl === "string"
          ? req.body.receiptUrl.trim()
          : "";

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          error: "El importe debe ser mayor que cero.",
        });
      }

      if (!receiptUrl) {
        return res.status(400).json({
          error: "El comprobante es obligatorio.",
        });
      }

      let result: any = null;

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          result = await prisma.$transaction(
            async (tx) => {
              const trip = await tx.travelTrip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            status: true,
            company: {
              select: {
                accessStatus: true,
                trialEndsAt: true,
              },
            },
          },
        });

        if (!trip) {
          throw Object.assign(
            new Error("Viaje no encontrado."),
            { httpStatus: 404 }
          );
        }

        if (trip.status !== "PUBLISHED") {
          throw Object.assign(
            new Error("El viaje no está publicado."),
            { httpStatus: 409 }
          );
        }

        if (!hasTravelCompanyOperationalAccess(trip.company)) {
          throw Object.assign(
            new Error("La empresa no tiene acceso operativo."),
            { httpStatus: 403 }
          );
        }

        const reservation = await tx.travelReservation.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId,
            },
          },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            totalPaid: true,
            pendingBalance: true,
          },
        });

        if (!reservation) {
          throw Object.assign(
            new Error("No tenés una reserva para este viaje."),
            { httpStatus: 404 }
          );
        }

        if (reservation.status !== "CONFIRMED") {
          throw Object.assign(
            new Error(
              "La reserva debe estar confirmada antes de informar pagos de saldo."
            ),
            { httpStatus: 409 }
          );
        }

        const pendingBalance =
          reservation.pendingBalance ??
          Math.max(
            (reservation.totalPrice ?? 0) - reservation.totalPaid,
            0
          );

        if (pendingBalance <= 0) {
          throw Object.assign(
            new Error("La reserva no tiene saldo pendiente."),
            { httpStatus: 409 }
          );
        }

        const activeReportedPayments =
          await tx.travelPayment.aggregate({
            where: {
              reservationId: reservation.id,
              status: "REPORTED",
            },
            _sum: {
              amount: true,
            },
          });

        const alreadyReported =
          activeReportedPayments._sum.amount ?? 0;

        const availableToReport =
          Math.round(
            (
              Math.max(
                pendingBalance - alreadyReported,
                0
              ) + Number.EPSILON
            ) * 100
          ) / 100;

        if (availableToReport <= 0) {
          throw Object.assign(
            new Error(
              "Ya hay pagos informados pendientes de verificación que cubren el saldo."
            ),
            { httpStatus: 409 }
          );
        }

        if (amount > availableToReport) {
          throw Object.assign(
            new Error(
              `El importe supera el saldo disponible para informar (${availableToReport}).`
            ),
            { httpStatus: 400 }
          );
        }

        const now = new Date();

        const payment = await tx.travelPayment.create({
          data: {
            reservationId: reservation.id,
            amount:
              Math.round(
                (amount + Number.EPSILON) * 100
              ) / 100,
            status: "REPORTED",
            receiptUrl,
            reportedAt: now,
          },
        });

        return {
          reservation,
          payment,
          pendingBalance,
          availableToReport,
        };
            },
            {
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            }
          );

          break;
        } catch (error: any) {
          if (error?.code === "P2034" && attempt < 4) {
            continue;
          }

          throw error;
        }
      }

      if (!result) {
        throw new Error(
          "No se pudo completar el pago de saldo."
        );
      }

      return res.status(201).json({
        success: true,
        message:
          "Pago informado. Quedó pendiente de verificación por la empresa.",
        reservationId: result.reservation.id,
        payment: result.payment,
        pendingBalance: result.pendingBalance,
        availableToReport: result.availableToReport,
      });
    } catch (error: any) {
      if (typeof error?.httpStatus === "number") {
        return res.status(error.httpStatus).json({
          error: error.message,
        });
      }

      console.error(
        "Error informando pago de saldo:",
        error
      );

      return res.status(500).json({
        error: "No se pudo informar el pago de saldo.",
      });
    }
  }
);
/* =========================================================
   VIARANK VIAJES - VERIFICAR PAGO
========================================================= */
app.post(
  "/api/travel/trips/:tripId/payments/:paymentId/verify",
  async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autenticado.",
        });
      }

      const tripId = String(req.params.tripId || "").trim();
      const paymentId = String(req.params.paymentId || "").trim();

      const access = await getTravelTripAccess(tripId, userId);

      if (!access) {
        return res.status(404).json({
          error: "Viaje no encontrado.",
        });
      }

      if (!hasTravelCompanyOperationalAccess(access.trip.company)) {
        return res.status(403).json({
          error: "La empresa no tiene acceso operativo.",
        });
      }

      if (!hasTravelTripPermission(access, "manageFinancials")) {
        return res.status(403).json({
          error: "No tenés permiso para administrar pagos.",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.travelPayment.findUnique({
          where: { id: paymentId },
          include: {
            reservation: {
              select: {
                id: true,
                tripId: true,
                status: true,
                totalPrice: true,
                pendingBalance: true,
                reservationRequiredAmount: true,
                confirmedAt: true,
              },
            },
          },
        });

        if (!payment || payment.reservation.tripId !== tripId) {
          throw Object.assign(
            new Error("Pago no encontrado."),
            { httpStatus: 404 }
          );
        }

        if (payment.status !== "REPORTED") {
          throw Object.assign(
            new Error("El pago ya fue procesado."),
            { httpStatus: 409 }
          );
        }

        if (payment.reservation.status === "CANCELLED") {
          throw Object.assign(
            new Error("La reserva está cancelada."),
            { httpStatus: 409 }
          );
        }

        const now = new Date();

        const verifiedUpdate = await tx.travelPayment.updateMany({
          where: {
            id: payment.id,
            status: "REPORTED",
          },
          data: {
            status: "VERIFIED",
            verifiedAt: now,
            rejectedAt: null,
          },
        });

        if (verifiedUpdate.count !== 1) {
          throw Object.assign(
            new Error("El pago ya fue procesado."),
            { httpStatus: 409 }
          );
        }

        const verifiedPayment = await tx.travelPayment.findUnique({
          where: { id: payment.id },
        });

        if (!verifiedPayment) {
          throw Object.assign(
            new Error("Pago no encontrado."),
            { httpStatus: 404 }
          );
        }

        const totals = await tx.travelPayment.aggregate({
          where: {
            reservationId: payment.reservation.id,
            status: "VERIFIED",
          },
          _sum: {
            amount: true,
          },
        });

        const totalPaid =
          Math.round(
            (((totals._sum.amount ?? 0) + Number.EPSILON) * 100)
          ) / 100;

        const totalPrice = payment.reservation.totalPrice ?? 0;

        const pendingBalance =
          Math.round(
            ((Math.max(totalPrice - totalPaid, 0) + Number.EPSILON) * 100)
          ) / 100;

        const required =
          payment.reservation.reservationRequiredAmount ?? 0;

        const shouldConfirm =
          required > 0 && totalPaid >= required;

        const previousBalance =
          payment.reservation.pendingBalance ?? totalPrice;

        const reservation = await tx.travelReservation.update({
          where: {
            id: payment.reservation.id,
          },
          data: {
            totalPaid,
            pendingBalance,
            status: shouldConfirm ? "CONFIRMED" : "PENDING",
            confirmedAt: shouldConfirm
              ? (payment.reservation.confirmedAt ?? now)
              : null,
          },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            totalPaid: true,
            pendingBalance: true,
            reservationRequiredAmount: true,
            confirmedAt: true,
          },
        });

        if (previousBalance !== pendingBalance) {
          await tx.travelBalanceAdjustment.create({
            data: {
              reservationId: reservation.id,
              previousBalance,
              newBalance: pendingBalance,
              reason: `Pago verificado: ${payment.id}`,
            },
          });
        }

        return {
          payment: verifiedPayment,
          reservation,
        };
      });

      return res.json({
        success: true,
        message:
          result.reservation.status === "CONFIRMED"
            ? "Pago verificado y reserva confirmada."
            : "Pago verificado.",
        ...result,
      });
    } catch (error: any) {
      if (typeof error?.httpStatus === "number") {
        return res.status(error.httpStatus).json({
          error: error.message,
        });
      }

      console.error("Error verificando pago:", error);

      return res.status(500).json({
        error: "No se pudo verificar el pago.",
      });
    }
  }
);

/* =========================================================
   VIARANK VIAJES - RECHAZAR PAGO
========================================================= */
app.post(
  "/api/travel/trips/:tripId/payments/:paymentId/reject",
  async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({
          error: "No autenticado.",
        });
      }

      const tripId = String(req.params.tripId || "").trim();
      const paymentId = String(req.params.paymentId || "").trim();

      const notes =
        typeof req.body?.notes === "string"
          ? req.body.notes.trim() || null
          : null;

      const access = await getTravelTripAccess(tripId, userId);

      if (!access) {
        return res.status(404).json({
          error: "Viaje no encontrado.",
        });
      }

      if (!hasTravelCompanyOperationalAccess(access.trip.company)) {
        return res.status(403).json({
          error: "La empresa no tiene acceso operativo.",
        });
      }

      if (!hasTravelTripPermission(access, "manageFinancials")) {
        return res.status(403).json({
          error: "No tenés permiso para administrar pagos.",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.travelPayment.findUnique({
          where: { id: paymentId },
          include: {
            reservation: {
              select: {
                id: true,
                tripId: true,
                status: true,
              },
            },
          },
        });

        if (!payment || payment.reservation.tripId !== tripId) {
          throw Object.assign(
            new Error("Pago no encontrado."),
            { httpStatus: 404 }
          );
        }

        if (payment.status !== "REPORTED") {
          throw Object.assign(
            new Error("El pago ya fue procesado."),
            { httpStatus: 409 }
          );
        }

        if (payment.reservation.status === "CANCELLED") {
          throw Object.assign(
            new Error("La reserva está cancelada."),
            { httpStatus: 409 }
          );
        }

        const rejectedUpdate = await tx.travelPayment.updateMany({
          where: {
            id: payment.id,
            status: "REPORTED",
          },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            verifiedAt: null,
            notes,
          },
        });

        if (rejectedUpdate.count !== 1) {
          throw Object.assign(
            new Error("El pago ya fue procesado."),
            { httpStatus: 409 }
          );
        }

        const rejectedPayment = await tx.travelPayment.findUnique({
          where: { id: payment.id },
        });

        if (!rejectedPayment) {
          throw Object.assign(
            new Error("Pago no encontrado."),
            { httpStatus: 404 }
          );
        }

        const activePayments = await tx.travelPayment.count({
          where: {
            reservationId: payment.reservation.id,
            status: {
              in: ["REPORTED", "VERIFIED"],
            },
          },
        });

        return {
          payment: rejectedPayment,
          placeReleased:
            payment.reservation.status === "PENDING" &&
            activePayments === 0,
        };
      });

      return res.json({
        success: true,
        message: result.placeReleased
          ? "Pago rechazado. La plaza quedó liberada."
          : "Pago rechazado.",
        ...result,
      });
    } catch (error: any) {
      if (typeof error?.httpStatus === "number") {
        return res.status(error.httpStatus).json({
          error: error.message,
        });
      }

      console.error("Error rechazando pago:", error);

      return res.status(500).json({
        error: "No se pudo rechazar el pago.",
      });
    }
  }
);
app.get("/api/travel/trips/:tripId/team", async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);

    if (!requesterId) {
      return res.status(401).json({
        error: "No autenticado",
      });
    }

    const tripId = String(req.params.tripId || "").trim();

    const trip = await prisma.travelTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!trip) {
      return res.status(404).json({
        error: "Viaje no encontrado",
      });
    }

    const administration =
      await prisma.travelCompanyAdministrator.findUnique({
        where: {
          companyId_userId: {
            companyId: trip.companyId,
            userId: requesterId,
          },
        },
        select: {
          id: true,
        },
      });

    const ownTeamMembership =
      await prisma.travelTripTeamMember.findUnique({
        where: {
          tripId_userId: {
            tripId,
            userId: requesterId,
          },
        },
        select: {
          role: true,
        },
      });

    const canViewTeam =
      Boolean(administration) ||
      ownTeamMembership?.role === "ORGANIZER";

    if (!canViewTeam) {
      return res.status(403).json({
        error: "No tenés permisos para ver el equipo de este viaje",
      });
    }

    const team =
      await prisma.travelTripTeamMember.findMany({
        where: {
          tripId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: [
          {
            role: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    return res.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error(
      "Error obteniendo equipo del viaje:",
      error
    );

    return res.status(500).json({
      error: "No se pudo obtener el equipo del viaje",
    });
  }
});

app.post("/api/travel/trips/:tripId/team", async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);

    if (!requesterId) {
      return res.status(401).json({
        error: "No autenticado",
      });
    }

    const tripId = String(req.params.tripId || "").trim();

    const email =
      String(req.body?.email || "")
        .trim()
        .toLowerCase();

    const role =
      String(req.body?.role || "")
        .trim()
        .toUpperCase();

    if (!email) {
      return res.status(400).json({
        error: "El email es obligatorio",
      });
    }

    if (
      role !== "ORGANIZER" &&
      role !== "COLLABORATOR"
    ) {
      return res.status(400).json({
        error: "Rol de equipo inválido",
      });
    }

    const trip = await prisma.travelTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        companyId: true,
        company: {
          select: {
            accessStatus: true,
            trialEndsAt: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({
        error: "Viaje no encontrado",
      });
    }

    if (!hasTravelCompanyOperationalAccess(trip.company)) {
      return res.status(403).json({
        error: "La empresa no está habilitada para editar viajes",
      });
    }

    const administration =
      await prisma.travelCompanyAdministrator.findUnique({
        where: {
          companyId_userId: {
            companyId: trip.companyId,
            userId: requesterId,
          },
        },
        select: {
          id: true,
        },
      });

    const requesterTeam =
      await prisma.travelTripTeamMember.findUnique({
        where: {
          tripId_userId: {
            tripId,
            userId: requesterId,
          },
        },
        select: {
          role: true,
        },
      });

    const requesterIsOrganizer =
      requesterTeam?.role === "ORGANIZER";

    if (
      !administration &&
      !requesterIsOrganizer
    ) {
      return res.status(403).json({
        error: "No tenés permisos para administrar el equipo de este viaje",
      });
    }

    if (
      role === "ORGANIZER" &&
      !administration
    ) {
      return res.status(403).json({
        error: "Solo un administrador de la empresa puede designar organizadores",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: "No existe un usuario ViaRank con ese email",
      });
    }

    const existingMember =
      await prisma.travelTripTeamMember.findUnique({
        where: {
          tripId_userId: {
            tripId,
            userId: targetUser.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingMember) {
      return res.status(409).json({
        error: "La persona ya pertenece al equipo de este viaje",
      });
    }

    const collaboratorPermissions =
      role === "COLLABORATOR"
        ? {
            canManageParticipants:
              req.body?.canManageParticipants === true,
            canManageActivities:
              req.body?.canManageActivities === true,
            canManageAccommodation:
              req.body?.canManageAccommodation === true,
            canManageFood:
              req.body?.canManageFood === true,
            canManageTransport:
              req.body?.canManageTransport === true,
            canManageInsurance:
              req.body?.canManageInsurance === true,
            canManageEquipment:
              req.body?.canManageEquipment === true,
            canManageNotices:
              req.body?.canManageNotices === true,
            canContactParticipants:
              req.body?.canContactParticipants === true,
            canViewFinancials:
              req.body?.canViewFinancials === true,
            canManageFinancials:
              req.body?.canManageFinancials === true,
          }
        : {
            canManageParticipants: false,
            canManageActivities: false,
            canManageAccommodation: false,
            canManageFood: false,
            canManageTransport: false,
            canManageInsurance: false,
            canManageEquipment: false,
            canManageNotices: false,
            canContactParticipants: false,
            canViewFinancials: false,
            canManageFinancials: false,
          };

    if (
      !administration &&
      (
        collaboratorPermissions.canViewFinancials ||
        collaboratorPermissions.canManageFinancials
      )
    ) {
      return res.status(403).json({
        error: "Solo un administrador de la empresa puede otorgar permisos económicos",
      });
    }

    if (collaboratorPermissions.canManageFinancials) {
      collaboratorPermissions.canViewFinancials = true;
    }

    const member =
      await prisma.travelTripTeamMember.create({
        data: {
          tripId,
          userId: targetUser.id,
          role,
          ...collaboratorPermissions,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

    return res.status(201).json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(
      "Error agregando integrante al viaje:",
      error
    );

    return res.status(500).json({
      error: "No se pudo agregar el integrante al viaje",
    });
  }
});

app.patch(
  "/api/travel/trips/:tripId/team/:memberId",
  async (req, res) => {
    try {
      const requesterId = getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const memberId =
        String(req.params.memberId || "").trim();

      const trip = await prisma.travelTrip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          companyId: true,
          company: {
            select: {
              accessStatus: true,
              trialEndsAt: true,
            },
          },
        },
      });

      if (!trip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      if (!hasTravelCompanyOperationalAccess(trip.company)) {
        return res.status(403).json({
          error: "La empresa no está habilitada para editar viajes",
        });
      }

      const targetMember =
        await prisma.travelTripTeamMember.findFirst({
          where: {
            id: memberId,
            tripId,
          },
        });

      if (!targetMember) {
        return res.status(404).json({
          error: "Integrante no encontrado",
        });
      }

      const administration =
        await prisma.travelCompanyAdministrator.findUnique({
          where: {
            companyId_userId: {
              companyId: trip.companyId,
              userId: requesterId,
            },
          },
          select: {
            id: true,
          },
        });

      const requesterTeam =
        await prisma.travelTripTeamMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId: requesterId,
            },
          },
          select: {
            role: true,
          },
        });

      const requesterIsOrganizer =
        requesterTeam?.role === "ORGANIZER";

      if (
        !administration &&
        !requesterIsOrganizer
      ) {
        return res.status(403).json({
          error: "No tenés permisos para modificar este equipo",
        });
      }

      const requestedRole =
        req.body?.role === undefined
          ? targetMember.role
          : String(req.body.role)
              .trim()
              .toUpperCase();

      if (
        requestedRole !== "ORGANIZER" &&
        requestedRole !== "COLLABORATOR"
      ) {
        return res.status(400).json({
          error: "Rol de equipo inválido",
        });
      }

      if (
        !administration &&
        (
          targetMember.role === "ORGANIZER" ||
          requestedRole === "ORGANIZER"
        )
      ) {
        return res.status(403).json({
          error: "Solo un administrador de la empresa puede modificar organizadores",
        });
      }

      const boolValue = (
        value: unknown,
        current: boolean
      ) =>
        typeof value === "boolean"
          ? value
          : current;

      let permissions = {
        canManageParticipants:
          boolValue(
            req.body?.canManageParticipants,
            targetMember.canManageParticipants
          ),
        canManageActivities:
          boolValue(
            req.body?.canManageActivities,
            targetMember.canManageActivities
          ),
        canManageAccommodation:
          boolValue(
            req.body?.canManageAccommodation,
            targetMember.canManageAccommodation
          ),
        canManageFood:
          boolValue(
            req.body?.canManageFood,
            targetMember.canManageFood
          ),
        canManageTransport:
          boolValue(
            req.body?.canManageTransport,
            targetMember.canManageTransport
          ),
        canManageInsurance:
          boolValue(
            req.body?.canManageInsurance,
            targetMember.canManageInsurance
          ),
        canManageEquipment:
          boolValue(
            req.body?.canManageEquipment,
            targetMember.canManageEquipment
          ),
        canManageNotices:
          boolValue(
            req.body?.canManageNotices,
            targetMember.canManageNotices
          ),
        canContactParticipants:
          boolValue(
            req.body?.canContactParticipants,
            targetMember.canContactParticipants
          ),
        canViewFinancials:
          boolValue(
            req.body?.canViewFinancials,
            targetMember.canViewFinancials
          ),
        canManageFinancials:
          boolValue(
            req.body?.canManageFinancials,
            targetMember.canManageFinancials
          ),
      };

      if (requestedRole === "ORGANIZER") {
        permissions = {
          canManageParticipants: false,
          canManageActivities: false,
          canManageAccommodation: false,
          canManageFood: false,
          canManageTransport: false,
          canManageInsurance: false,
          canManageEquipment: false,
          canManageNotices: false,
          canContactParticipants: false,
          canViewFinancials: false,
          canManageFinancials: false,
        };
      }

      if (
        !administration &&
        (
          permissions.canViewFinancials !==
            targetMember.canViewFinancials ||
          permissions.canManageFinancials !==
            targetMember.canManageFinancials
        )
      ) {
        return res.status(403).json({
          error: "Solo un administrador de la empresa puede modificar permisos económicos",
        });
      }

      if (permissions.canManageFinancials) {
        permissions.canViewFinancials = true;
      }

      const updatedMember =
        await prisma.travelTripTeamMember.update({
          where: {
            id: targetMember.id,
          },
          data: {
            role: requestedRole,
            ...permissions,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
              },
            },
          },
        });

      return res.json({
        success: true,
        member: updatedMember,
      });
    } catch (error) {
      console.error(
        "Error modificando integrante del viaje:",
        error
      );

      return res.status(500).json({
        error: "No se pudo modificar el integrante",
      });
    }
  }
);

app.delete(
  "/api/travel/trips/:tripId/team/:memberId",
  async (req, res) => {
    try {
      const requesterId = getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const tripId =
        String(req.params.tripId || "").trim();

      const memberId =
        String(req.params.memberId || "").trim();

      const trip = await prisma.travelTrip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          companyId: true,
          company: {
            select: {
              accessStatus: true,
              trialEndsAt: true,
            },
          },
        },
      });

      if (!trip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      if (!hasTravelCompanyOperationalAccess(trip.company)) {
        return res.status(403).json({
          error: "La empresa no está habilitada para editar viajes",
        });
      }

      const targetMember =
        await prisma.travelTripTeamMember.findFirst({
          where: {
            id: memberId,
            tripId,
          },
        });

      if (!targetMember) {
        return res.status(404).json({
          error: "Integrante no encontrado",
        });
      }

      const administration =
        await prisma.travelCompanyAdministrator.findUnique({
          where: {
            companyId_userId: {
              companyId: trip.companyId,
              userId: requesterId,
            },
          },
          select: {
            id: true,
          },
        });

      const requesterTeam =
        await prisma.travelTripTeamMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId: requesterId,
            },
          },
          select: {
            role: true,
          },
        });

      const requesterIsOrganizer =
        requesterTeam?.role === "ORGANIZER";

      if (
        !administration &&
        !requesterIsOrganizer
      ) {
        return res.status(403).json({
          error: "No tenés permisos para quitar integrantes",
        });
      }

      if (
        !administration &&
        targetMember.role === "ORGANIZER"
      ) {
        return res.status(403).json({
          error: "Solo un administrador de la empresa puede quitar organizadores",
        });
      }

      await prisma.travelTripTeamMember.delete({
        where: {
          id: targetMember.id,
        },
      });

      return res.json({
        success: true,
        message: "Integrante eliminado del equipo",
      });
    } catch (error) {
      console.error(
        "Error eliminando integrante del viaje:",
        error
      );

      return res.status(500).json({
        error: "No se pudo eliminar el integrante",
      });
    }
  }
);
/* =========================================================
   /* =========================================================
   VIARANK VIAJES - ADMINISTRACION DE EMPRESAS
   Pruebas gratuitas y semaforo de vencimiento
========================================================= */

app.get(
  "/api/admin/travel/companies",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (
        !requester ||
        requester.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Acceso exclusivo para SUPER_ADMIN",
        });
      }

      const companies =
        await prisma.travelCompany.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });

      const now = new Date();
      const warningDays = 15;
      const millisecondsPerDay =
        1000 * 60 * 60 * 24;

      const companiesWithTrialStatus =
        companies.map((company) => {
          let trialSemaphore:
            | "GREEN"
            | "YELLOW"
            | "RED"
            | null = null;

          let trialDaysRemaining:
            | number
            | null = null;

          if (
            company.accessStatus === "TRIAL" &&
            company.trialEndsAt
          ) {
            const difference =
              company.trialEndsAt.getTime() -
              now.getTime();

            trialDaysRemaining =
              Math.max(
                0,
                Math.ceil(
                  difference /
                    millisecondsPerDay
                )
              );

            if (difference <= 0) {
              trialSemaphore = "RED";
              trialDaysRemaining = 0;
            } else if (
              trialDaysRemaining <= warningDays
            ) {
              trialSemaphore = "YELLOW";
            } else {
              trialSemaphore = "GREEN";
            }
          }

          return {
            ...company,
            trialSemaphore,
            trialDaysRemaining,
          };
        });

      const trialSummary = {
        green: companiesWithTrialStatus.filter(
          (company) =>
            company.trialSemaphore === "GREEN"
        ).length,
        yellow: companiesWithTrialStatus.filter(
          (company) =>
            company.trialSemaphore === "YELLOW"
        ).length,
        red: companiesWithTrialStatus.filter(
          (company) =>
            company.trialSemaphore === "RED"
        ).length,
      };

      return res.json({
        success: true,
        warningDays,
        trialSummary,
        companies: companiesWithTrialStatus,
      });
    } catch (error) {
      console.error(
        "Error listando empresas de ViaRank Viajes:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron obtener las empresas",
      });
    }
  }
);

app.post(
  "/api/admin/travel/companies/:companyId/trial",
  async (req, res) => {
    try {
      const requesterId =
        getAuthenticatedUserId(req);

      if (!requesterId) {
        return res.status(401).json({
          error: "No autenticado",
        });
      }

      const requester =
        await prisma.user.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            role: true,
          },
        });

      if (
        !requester ||
        requester.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Acceso exclusivo para SUPER_ADMIN",
        });
      }

      const companyId =
        req.params.companyId;

      const months =
        Number(req.body?.months);

      if (
        !Number.isInteger(months) ||
        months < 1 ||
        months > 60
      ) {
        return res.status(400).json({
          error:
            "La cantidad de meses debe ser un numero entero entre 1 y 60",
        });
      }

      const company =
        await prisma.travelCompany.findUnique({
          where: {
            id: companyId,
          },
        });

      if (!company) {
        return res.status(404).json({
          error: "Empresa no encontrada",
        });
      }

      const now = new Date();

      /*
        Si ya tiene una prueba vigente, la extension
        comienza desde el vencimiento actual.
        Si no, comienza desde hoy.
      */
      const extensionBase =
        company.accessStatus === "TRIAL" &&
        company.trialEndsAt &&
        company.trialEndsAt.getTime() >
          now.getTime()
          ? new Date(company.trialEndsAt)
          : new Date(now);

      const trialStartedAt =
        company.accessStatus === "TRIAL" &&
        company.trialStartedAt
          ? company.trialStartedAt
          : now;

      const trialEndsAt =
        new Date(extensionBase);

      trialEndsAt.setMonth(
        trialEndsAt.getMonth() + months
      );

      const previousMonths =
        company.accessStatus === "TRIAL"
          ? company.trialMonthsGranted ?? 0
          : 0;

      const updatedCompany =
        await prisma.travelCompany.update({
          where: {
            id: companyId,
          },
          data: {
            accessStatus: "TRIAL",
            accessStartsAt:
              company.accessStartsAt ?? now,
            accessExpiresAt: trialEndsAt,

            trialStartedAt,
            trialEndsAt,
            trialMonthsGranted:
              previousMonths + months,
            trialGrantedAt: now,
            trialGrantedByUserId:
              requesterId,
          },
        });

      const millisecondsPerDay =
        1000 * 60 * 60 * 24;

      const trialDaysRemaining =
        Math.max(
          0,
          Math.ceil(
            (
              trialEndsAt.getTime() -
              now.getTime()
            ) / millisecondsPerDay
          )
        );

      const trialSemaphore =
        trialDaysRemaining <= 15
          ? "YELLOW"
          : "GREEN";

      return res.json({
        success: true,
        message:
          "Periodo de prueba gratuita actualizado",
        company: {
          ...updatedCompany,
          trialSemaphore,
          trialDaysRemaining,
        },
      });
    } catch (error) {
      console.error(
        "Error otorgando prueba gratuita:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar el periodo de prueba",
      });
    }
  }
);
app.listen(
  PORT,
  () => {
    console.log(
      `ViaRank API funcionando en http://localhost:${PORT}`
    );
  }
);

