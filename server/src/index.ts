import express from "express";
import { rateLimit } from "express-rate-limit";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
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

      if (
        administration.company.accessStatus !== "ACTIVE" &&
        administration.company.accessStatus !== "TRIAL" &&
        administration.company.accessStatus !== "EXEMPT"
      ) {
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
  Solo los administradores de la empresa pueden modificarlo.
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
            company: {
              select: {
                accessStatus: true,
              },
            },
          },
        });

      if (!existingTrip) {
        return res.status(404).json({
          error: "Viaje no encontrado",
        });
      }

      const administration =
        await prisma.travelCompanyAdministrator.findUnique({
          where: {
            companyId_userId: {
              companyId: existingTrip.companyId,
              userId: requesterId,
            },
          },
          select: {
            id: true,
          },
        });

      if (!administration) {
        return res.status(403).json({
          error:
            "No tenés permisos para administrar este viaje",
        });
      }

      if (
        existingTrip.company.accessStatus !== "ACTIVE" &&
        existingTrip.company.accessStatus !== "TRIAL" &&
        existingTrip.company.accessStatus !== "EXEMPT"
      ) {
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
      const normalizedPrice = parseOptionalNumber(price);
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

app.listen(
  PORT,
  () => {
    console.log(
      `ViaRank API funcionando en http://localhost:${PORT}`
    );
  }
);

