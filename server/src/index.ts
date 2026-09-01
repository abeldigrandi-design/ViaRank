import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "viarank-dev-secret";
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

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
   USUARIOS
========================================================= */

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
          "No se pudo comprobar la conexión con Strava",
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
   INTERCAMBIO DEL CÓDIGO DE STRAVA
========================================================= */

app.post(
  "/exchange_token",
  async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          error:
            "No se recibió el código de Strava",
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
        "Intercambiando código con Strava..."
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
            "Strava no devolvió los datos del atleta",
        });
      }

      const athlete = data.athlete;

      console.log(
        "Atleta recibido:",
        athlete.id,
        athlete.firstname,
        athlete.lastname
      );

      const user =
        await prisma.user.upsert({
          where: {
            stravaId:
              String(athlete.id),
          },

          update: {
            firstName:
              athlete.firstname || "",

            lastName:
              athlete.lastname || "",

            profilePicture:
              athlete.profile_medium ||
              athlete.profile ||
              null,

            city:
              athlete.city || null,

            country:
              athlete.country || null,

            accessToken:
              data.access_token,

            refreshToken:
              data.refresh_token,

            expiresAt:
              data.expires_at,
          },

          create: {
            stravaId:
              String(athlete.id),

            firstName:
              athlete.firstname || "",

            lastName:
              athlete.lastname || "",

            profilePicture:
              athlete.profile_medium ||
              athlete.profile ||
              null,

            city:
              athlete.city || null,

            country:
              athlete.country || null,

            accessToken:
              data.access_token,

            refreshToken:
              data.refresh_token,

            expiresAt:
              data.expires_at,
          },
        });

      console.log(
        "Usuario guardado en PostgreSQL"
      );

      console.log(
        "ID ViaRank:",
        user.id
      );

      console.log(
        "Strava ID:",
        user.stravaId
      );
      const authToken = jwt.sign(
  {
    userId: user.id,
  },
  JWT_SECRET,
  {
    expiresIn: "7d",
  }
);
      return res.json({
        success: true,

        authToken,

        message:
          "Cuenta de Strava conectada correctamente",

        athlete:
          data.athlete,

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
      "Strava rechazó la renovación del token"
    );
  }

  if (!data.access_token) {
    throw new Error(
      "Strava no devolvió un nuevo access token"
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
   OBTENER ACCESS TOKEN VÁLIDO
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
      "Access Token todavía válido"
    );

    return user.accessToken;
  }

  console.log(
    "Access Token vencido o próximo a vencer"
  );

  return await refreshStravaToken(
    user
  );
}

/* =========================================================
   IMPORTAR TODAS LAS ACTIVIDADES DESDE STRAVA
   PAGINACIÓN AUTOMÁTICA
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
            "No hay ningún usuario conectado con Strava",
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
            "No se pudo obtener un Access Token válido",
        });
      }

      const allActivities: any[] =
        [];

      let page = 1;
      const perPage = 200;

      while (true) {
        console.log(
          `Pidiendo actividades a Strava - página ${page}...`
        );

        const response =
          await fetch(
            `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
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
                "Strava devolvió una respuesta inesperada",
            });
        }

        console.log(
          `Página ${page}: ${pageData.length} actividades`
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
        `Strava devolvió ${allActivities.length} actividades en total`
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
   RANKING DEPORTIVO
========================================================= */

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
   GENERAR CÓDIGO ÚNICO DE GRUPO
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
            "Deporte no válido",
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
      const search =
        String(
          req.query.search || ""
        ).trim();

      const sport =
        String(
          req.query.sport || ""
        ).toUpperCase();

      const where: any = {};

      if (search) {
        where.name = {
          contains: search,
          mode: "insensitive",
        };
      }

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
        where.sport = sport;
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
          },
        });

      return res.json({
        success: true,
        count:
          groups.length,
        groups,
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
   UNIRSE A UN GRUPO POR CÓDIGO
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
            "Faltan usuario o código de grupo",
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
            "Código de grupo inválido",
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
        "Error uniéndose al grupo:",
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

      const group =
        await prisma.sportGroup.findUnique({
          where: {
            id: groupId,
          },

          include: {
            members: {
              select: {
                userId: true,
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

      const memberIds =
        group.members.map(
          (member: { userId: string }) =>
            member.userId
        );

      let startDate:
        | Date
        | undefined;

      const now =
        new Date();

      if (period === "week") {
        startDate =
          new Date(now);

        startDate.setDate(
          now.getDate() - 7
        );
      }

      if (period === "month") {
        startDate =
          new Date(now);

        startDate.setMonth(
          now.getMonth() - 1
        );
      }

      if (period === "year") {
        startDate =
          new Date(
            now.getFullYear(),
            0,
            1
          );
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
            })
          );

      return res.json({
        success: true,

        group: {
          id: group.id,
          name: group.name,
          sport: group.sport,
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
  (
    user.role === "ADMIN" &&
    group.administratorId ===
      administratorId
  );

      if (!canDelete) {
        return res.status(403).json({
          error:
            "No tenés permiso para eliminar este grupo",
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
            "No tenés permiso para quitar miembros de este grupo",
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
/* =========================================================
   INICIAR SERVIDOR
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `ViaRank API funcionando en http://localhost:${PORT}`
    );
  }
);