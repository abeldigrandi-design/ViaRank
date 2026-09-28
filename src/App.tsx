import { useEffect, useState } from "react";
import SportPage from "./pages/SportPage";
import GroupPage from "./pages/GroupPage";
import viarankHeaderLogo from "./assets/viarank-header-logo-clean.png";
import heroImage from "./assets/hero-sport.png";
import sportCiclismo from "./assets/sports/sport-ciclismo.png";
import sportCarrera from "./assets/sports/sport-carrera.png";
import sportNatacion from "./assets/sports/sport-natacion.png";
import sportSenderismo from "./assets/sports/sport-senderismo.png";
import sportCaminata from "./assets/sports/sport-caminata.png";
import sportSillaRuedas from "./assets/sports/sport-silla-ruedas.png";
import sportKayak from "./assets/sports/sport-kayak.png";
import sportRemo from "./assets/sports/sport-remo.png";
import sportVela from "./assets/sports/sport-vela.png";
import sportWindsurf from "./assets/sports/sport-windsurf.png";
const API_URL = import.meta.env.VITE_API_URL;
type RankingAthlete = {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  activities: number;
  distance: number;
  movingTime: number;
  elevationGain: number;
  distanceKm: number;
  hours: number;
hasOverlap?: boolean;
};
type ActivityHistoryItem = {
  id: string;
  externalId: string;
  source: string;
  type: string;
  name: string;
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageSpeed: number | null;
  calories: number | null;
  startDate: string;
  distanceKm: number;
  endDate: string;
hasOverlap?: boolean;
};

type ActivityHistoryResponse = {
  success: boolean;
  count: number;
  activities: ActivityHistoryItem[];
};
type RankingResponse = {
  success: boolean;
  count: number;
  ranking: RankingAthlete[];
};
type SportGroup = {
  id: string;
  name: string;
  sport: string;
  joinCode: string;
  visibility: "PUBLIC" | "PRIVATE";
  isMember?: boolean;

  administrator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };

  _count?: {
    members: number;
  };
};

type GroupsResponse = {
  success: boolean;
  count: number;
  groups: SportGroup[];
};
type GroupRankingResponse = {
  success: boolean;

  group: {
    id: string;
    name: string;
    sport: string;
    joinCode: string;
  visibility: "PUBLIC" | "PRIVATE";
  isMember?: boolean;

    administrator: {
      id: string;
      firstName: string;
      lastName: string;
    };

    members: number;
  };

  count: number;
  ranking: RankingAthlete[];
};
type GroupMemberItem = {
  membershipId: string;
  joinedAt: string;

  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    role: string;
    isGroupAdministrator: boolean;
  };
};

type GroupMembersResponse = {
  success: boolean;
  count: number;
  members: GroupMemberItem[];
};
function App() {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessionRestoring, setSessionRestoring] = useState(true);
 const [emailFirstName, setEmailFirstName] = useState("");
const [emailLastName, setEmailLastName] = useState("");
const [emailAddress, setEmailAddress] = useState("");
const [emailSex, setEmailSex] = useState<"MALE" | "FEMALE" | "">("");
const [emailCode, setEmailCode] = useState("");
const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
const [emailMode, setEmailMode] = useState<"register" | "login">("register");
const [emailLoading, setEmailLoading] = useState(false);
const [emailMessage, setEmailMessage] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
  const isSuperAdmin =
  user?.role === "SUPER_ADMIN";

function canManageGroup(
  group: SportGroup
) {
  if (!user?.id) {
    return false;
  }

  return (
    isSuperAdmin ||
    group.administrator.id === user.id
);
}
  const [, setRanking] = useState<
    RankingAthlete[]
  >([]);

  const [sport, setSport] = useState("");
  const [sportPage, setSportPage] = useState<string | null>(null);
  const [myActivityBySport, setMyActivityBySport] = useState<Record<string, RankingAthlete>>({});
  const [period, setPeriod] = useState("month");
  const [menuOpen, setMenuOpen] = useState(false);

  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
const [groups, setGroups] = useState<
  SportGroup[]
>([]);

const [groupsLoading, setGroupsLoading] =
  useState(false);

const [groupSportFilter, setGroupSportFilter] =
  useState("");

const [joinCode, setJoinCode] =
  useState("");
const [selectedGroup, setSelectedGroup] =
  useState<GroupRankingResponse["group"] | null>(
    null
  );

const [groupRanking, setGroupRanking] =
  useState<RankingAthlete[]>([]);
const [, setActivityHistory] =
  useState<ActivityHistoryItem[]>([]);

const [, setActivityHistoryLoading] =
  useState(false);

const [, setActivityHistoryAthlete] =
  useState<RankingAthlete | null>(null);
const [groupRankingLoading, setGroupRankingLoading] =
  useState(false);
const [groupSexFilter, setGroupSexFilter] =
  useState("");
const [newGroupName, setNewGroupName] =
  useState("");

const [newGroupSport, setNewGroupSport] =
  useState("RIDE");

const [newGroupVisibility, setNewGroupVisibility] =
  useState("PUBLIC");

const [creatingGroup, setCreatingGroup] =
  useState(false);
const [showCreateGroup, setShowCreateGroup] =
  useState(false);
const [adminGroup, setAdminGroup] =
  useState<SportGroup | null>(null);

const [groupMembers, setGroupMembers] =
  useState<GroupMemberItem[]>([]);

const [groupMembersLoading, setGroupMembersLoading] =
  useState(false);
const [adminUsers, setAdminUsers] = useState<any[]>([]);

const [adminUsersLoading, setAdminUsersLoading] =
  useState(false);
  /* =====================================================
     COMPROBAR CONEXIÓN CON STRAVA
  ===================================================== */
async function restoreSession() {
  const refreshToken =
    localStorage.getItem(
      "viarank_refresh_token"
    );

  if (!refreshToken) {
    await checkStrava();
    setSessionRestoring(false);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          refreshToken,
        }),
      }
    );

    if (!response.ok) {
      localStorage.removeItem(
        "viarank_refresh_token"
      );

      await checkStrava();
      return;
    }

    const data =
      await response.json();

    localStorage.setItem(
      "viarank_auth_token",
      data.authToken
    );

    setUser(data.user);

    await checkStrava();
  } catch (error) {
    console.error(
      "Error restaurando sesión:",
      error
    );

    await checkStrava();
  } finally {
    setSessionRestoring(false);
  }
}
 useEffect(() => {
  restoreSession();
}, []);

  /* =====================================================
     CARGAR RANKING
  ===================================================== */
useEffect(() => {
  if (!connected) {
    return;
  }

  const syncStravaOnLogin = async () => {
    try {
      console.log(
        "Sincronizando Strava automáticamente..."
      );

      const authToken =
        localStorage.getItem(
          "viarank_auth_token"
        );

      if (!authToken) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/strava-activities/import`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Error en sincronización automática:",
          data
        );
        return;
      }

      console.log(
        "Sincronización automática completada:",
        data
      );

      await loadRanking();
      await loadGroups();
    } catch (error) {
      console.error(
        "Error sincronizando Strava automáticamente:",
        error
      );
    }
  };

  syncStravaOnLogin();
}, [connected]);
useEffect(() => {
  if (connected) {
    loadRanking();
    loadMyActivityBySport();
  }
}, [connected, sport, period]);

useEffect(() => {
  if (connected) {
    loadMyActivityBySport();
    loadGroups();

    if (isSuperAdmin) {
      loadAdminUsers();
    }
  }
}, [connected, sport, isSuperAdmin]);


useEffect(() => {
  if (selectedGroup) {
    loadGroupRanking(selectedGroup.id);
  }
}, [period, groupSexFilter]);
  /* =====================================================
     ESTADO STRAVA
  ===================================================== */

  async function checkStrava() {
    try {
      setLoading(true);

      const authToken =
  localStorage.getItem(
    "viarank_auth_token"
  );

const response = await fetch(
  `${API_URL}/api/strava-status`,
  {
    headers: authToken
      ? {
          Authorization:
            `Bearer ${authToken}`,
        }
      : {},
  }
);

      const data = await response.json();

      console.log(
        "ESTADO STRAVA:",
        data
      );

      setConnected(Boolean(data.connected));
setUser(data.user || null);
    } catch (err) {
      console.error(
        "Error comprobando Strava:",
        err
      );

      setConnected(false);
    } finally {
      setLoading(false);
    }
  }
 async function requestEmailCode() {
  try {
   setEmailLoading(true);
setEmailMessage("");

    const response = await fetch(
      `${API_URL}/api/auth/request-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         firstName: emailFirstName,
lastName: emailLastName,
email: emailAddress,
sex: emailSex,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setEmailMessage(
        data.error || "No se pudo generar el código"
      );
      return;
    }

    setEmailStep("verify");
setEmailMessage(
      "Código generado. Revisá el código de verificación."
    );
  } catch (error) {
    console.error(error);
    setEmailMessage(
  "No se pudo conectar con ViaRank"
);
  
  } finally {
    setEmailLoading(false);
  }
}
  async function verifyEmailCode() {
  try {
    setEmailLoading(true);
setEmailMessage("");

    const response = await fetch(
      `${API_URL}/api/auth/verify-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  email: emailAddress,
  code: emailCode,
}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setEmailMessage(
        data.error || "No se pudo verificar el código"
      );
      return;
    }

    localStorage.setItem(
  "viarank_auth_token",
  data.authToken
);

localStorage.setItem(
  "viarank_refresh_token",
  data.refreshToken
);

setUser(data.user);

    setUser(data.user);
    await checkStrava();
    setEmailMessage("");
  } catch (error) {
    console.error(error);

    setEmailMessage(
  "No se pudo conectar con ViaRank"
);
  } finally {
    setEmailLoading(false);
  }
}
  /* =====================================================
     CARGAR RANKING
  ===================================================== */

  async function loadRanking() {
    try {
      setError("");

      const params = new URLSearchParams();

      if (sport) {
        params.set("sport", sport);
      }

      if (period) {
        params.set("period", period);
      }

      const url =
        `${API_URL}/api/ranking` +
        (params.toString()
          ? `?${params.toString()}`
          : "");

      console.log(
        "CARGANDO RANKING:",
        url
      );

      const response =
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
        },
      });

      const data: RankingResponse =
        await response.json();

      console.log(
        "RANKING:",
        data
      );

      if (!response.ok) {
        throw new Error(
          "No se pudo cargar el ranking"
        );
      }

      setRanking(data.ranking || []);
    } catch (err) {
      console.error(
        "Error cargando ranking:",
        err
      );

      setError(
        "No se pudo cargar el ranking."
      );
    }
  }
async function loadMyActivityBySport() {
  if (!user?.id) return;

  const sports = [
    "RIDE", "RUN", "SWIM", "HIKE", "WALK",
    "WHEELCHAIR", "KAYAK", "ROW", "SAIL", "WINDSURF"
  ];

  try {
    const results = await Promise.all(
      sports.map(async (sportType) => {
        const params = new URLSearchParams({
          sport: sportType,
          period,
        });

        const response = await fetch(
          `${API_URL}/api/ranking?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
            },
          }
        );

        if (!response.ok) return null;

        const data: RankingResponse = await response.json();
        const athlete = (data.ranking || []).find(
          (item) => item.userId === user.id
        );

        return athlete
          ? [sportType, athlete] as const
          : null;
      })
    );

    const bySport: Record<string, RankingAthlete> = {};

    results.forEach((result) => {
      if (result) {
        bySport[result[0]] = result[1];
      }
    });

    setMyActivityBySport(bySport);
  } catch (err) {
    console.error("Error cargando actividad por deporte:", err);
  }
}
/* =====================================================
   CARGAR GRUPOS
===================================================== */

async function loadGroups(selectedSport?: string) {
  try {
    setGroupsLoading(true);

    const params =
      new URLSearchParams();

   const sportToLoad =
  selectedSport !== undefined
    ? selectedSport
    : groupSportFilter;

if (!sportToLoad) {
  setGroups([]);
  return;
}

params.set(
  "sport",
  sportToLoad
);

    const url =
      `${API_URL}/api/groups` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

    const response =
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
        },
      });

    const data: GroupsResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        "No se pudieron cargar los grupos"
      );
    }

    setGroups(
      data.groups || []
    );
  } catch (err) {
    console.error(
      "Error cargando grupos:",
      err
    );
  } finally {
    setGroupsLoading(false);
  }
}
/* =====================================================
   CARGAR USUARIOS - SUPER_ADMIN
===================================================== */

async function loadAdminUsers() {
  if (!isSuperAdmin) {
    return;
  }

  try {
    setAdminUsersLoading(true);

    const response = await fetch(
      `${API_URL}/api/users`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "viarank_auth_token"
          )}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudieron cargar los usuarios"
      );
    }

    setAdminUsers(
      Array.isArray(data) ? data : []
    );
  } catch (err) {
    console.error(
      "Error cargando usuarios:",
      err
    );
  } finally {
    setAdminUsersLoading(false);
  }
}
async function deleteAdminUser(
  userId: string,
  userName: string
) {
  if (
    !confirm(
      `¿Seguro que querés eliminar a ${userName}? Esta acción eliminará también sus actividades, membresías y grupos administrados.`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "viarank_auth_token"
          )}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudo eliminar el usuario"
      );
    }

    alert(
      data.message ||
        "Usuario eliminado correctamente"
    );

    await loadAdminUsers();
  } catch (err) {
    console.error(
      "Error eliminando usuario:",
      err
    );

    alert(
      err instanceof Error
        ? err.message
        : "No se pudo eliminar el usuario"
    );
  }
}

/* =====================================================
   UNIRSE A GRUPO POR CÓDIGO
===================================================== */

async function joinGroup() {
  try {
    if (!user?.id) {
      alert(
        "No se pudo identificar al usuario."
      );
      return;
    }

    if (!joinCode.trim()) {
      alert(
        "Ingresá un código de grupo."
      );
      return;
    }

    const response =
      await fetch(
        `${API_URL}/api/groups/join`,
        {
          method: "POST",

         headers: {
  "Content-Type":
    "application/json",

  Authorization:
    `Bearer ${localStorage.getItem(
      "viarank_auth_token"
    )}`,
},

          body: JSON.stringify({
            userId:
              user.id,

            joinCode:
              joinCode
                .trim()
                .toUpperCase(),
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudo ingresar al grupo"
      );
    }

    alert(
      "Te uniste al grupo correctamente."
    );

    setJoinCode("");

    await loadGroups();
  } catch (err) {
    console.error(
      "Error uniéndose al grupo:",
      err
    );

    alert(
      "No se pudo ingresar al grupo."
    );
  }
}
async function loadActivityHistory(
  athlete: RankingAthlete
) {
  if (!selectedGroup) return;

  try {
    setActivityHistoryLoading(true);
    setActivityHistory([]);
    setActivityHistoryAthlete(athlete);
    setError("");

    const params = new URLSearchParams({
      userId: athlete.userId,
      groupId: selectedGroup.id,
      sport: selectedGroup.sport,
    });

    const response = await fetch(
      `${API_URL}/api/activities/history?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "viarank_auth_token"
          )}`,
        },
      }
    );

    const data: ActivityHistoryResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        (data as any).error ||
          "No se pudo cargar el historial."
      );
    }

    setActivityHistory(data.activities || []);
  } catch (err) {
    console.error(
      "Error cargando historial de actividades:",
      err
    );
    setError(
      "No se pudo cargar el historial de actividades."
    );
  } finally {
    setActivityHistoryLoading(false);
  }
}
/* =====================================================
   CARGAR RANKING DEL GRUPO
===================================================== */

async function loadGroupRanking(
  groupId: string
) {
  try {
    setGroupRankingLoading(true);
    setError("");

    const params =
      new URLSearchParams();

   if (period) {
  params.set(
    "period",
    period
  );
}

if (groupSexFilter) {
  params.set(
    "sex",
    groupSexFilter
  );
}


   const url =
      `${API_URL}/api/groups/${groupId}/ranking` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

   const response =
  await fetch(url, {
    headers: {
      Authorization:
        `Bearer ${localStorage.getItem(
          "viarank_auth_token"
        )}`,
    },
  });

    const data: GroupRankingResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        "No se pudo cargar el ranking del grupo"
      );
    }

    setSelectedGroup(
      data.group
    );

    setGroupRanking(
      data.ranking || []
    );
  } catch (err) {
    console.error(
      "Error cargando ranking del grupo:",
      err
    );

    alert(
      "No se pudo cargar el ranking del grupo."
    );
  } finally {
    setGroupRankingLoading(false);
  }
}
/* =====================================================
   CREAR GRUPO
===================================================== */

async function createGroup() {
  try {
    if (!user?.id) {
      alert(
        "No se pudo identificar al usuario."
      );
      return;
    }

    if (!newGroupName.trim()) {
      alert(
        "Ingresá un nombre para el grupo."
      );
      return;
    }

    setCreatingGroup(true);

    const response = await fetch(
      `${API_URL}/api/groups`,
      {
        method: "POST",

        headers: {
  "Content-Type":
    "application/json",

  Authorization:
    `Bearer ${localStorage.getItem(
      "viarank_auth_token"
    )}`,
},

        body: JSON.stringify({
          name:
            newGroupName.trim(),

          sport:
            newGroupSport,

          visibility:
            newGroupVisibility,

          administratorId:
            user.id,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudo crear el grupo"
      );
    }

    setNewGroupName("");
    setNewGroupSport("RIDE");
    setNewGroupVisibility("PUBLIC");

    await loadGroups();

    alert(
      `Grupo creado correctamente.\nCódigo de ingreso: ${data.group.joinCode}`
    );
  } catch (err) {
    console.error(
      "Error creando grupo:",
      err
    );

    alert(
      "No se pudo crear el grupo."
    );
  } finally {
    setCreatingGroup(false);
  }
}
/* =====================================================
   ELIMINAR GRUPO
===================================================== */
async function deleteGroup(
  groupId: string,
  groupName: string
) {
  if (!user?.id) {
    return;
  }

  const confirmed =
    window.confirm(
      `¿Seguro que querés eliminar el grupo "${groupName}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/groups/${groupId}`,
      {
        method: "DELETE",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${localStorage.getItem(
              "viarank_auth_token"
            )}`,
        },

        body: JSON.stringify({
          administratorId:
            user.id,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudo eliminar el grupo"
      );
    }

    await loadGroups();

    alert(
      "Grupo eliminado correctamente."
    );
  } catch (err) {
    console.error(
      "Error eliminando grupo:",
      err
    );

    alert(
      "No se pudo eliminar el grupo."
    );
  }
}
/* =====================================================
   CARGAR MIEMBROS DEL GRUPO
===================================================== */

async function loadGroupMembers(
  group: SportGroup
) {
  try {
    setGroupMembersLoading(true);
    setAdminGroup(group);

   const response = await fetch(
  `${API_URL}/api/groups/${group.id}/members`,
  {
    headers: {
      Authorization:
        `Bearer ${localStorage.getItem(
          "viarank_auth_token"
        )}`,
    },
  }
);

    const data: GroupMembersResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        "No se pudieron cargar los miembros"
      );
    }

    setGroupMembers(
      data.members || []
    );
  } catch (err) {
    console.error(
      "Error cargando miembros:",
      err
    );

    alert(
      "No se pudieron cargar los miembros del grupo."
    );
  } finally {
    setGroupMembersLoading(false);
  }
}

/* =====================================================
   QUITAR MIEMBRO DEL GRUPO
===================================================== */

async function removeGroupMember(
  memberUserId: string,
  memberName: string
) {
  if (!adminGroup || !user?.id) {
    return;
  }

  const confirmed =
    window.confirm(
      `¿Seguro que querés quitar a "${memberName}" del grupo "${adminGroup.name}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/groups/${adminGroup.id}/members/${memberUserId}`,
      {
        method: "DELETE",

     headers: {
  "Content-Type":
    "application/json",

  Authorization:
    `Bearer ${localStorage.getItem(
      "viarank_auth_token"
    )}`,
},
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudo quitar al atleta"
      );
    }

    await loadGroupMembers(
      adminGroup
    );

    await loadGroups();

    alert(
      "Atleta quitado del grupo correctamente."
    );
  } catch (err) {
    console.error(
      "Error quitando atleta:",
      err
    );

    alert(
      "No se pudo quitar al atleta del grupo."
    );
  }
}
  /* =====================================================
     ACTUALIZAR ACTIVIDADES DESDE STRAVA
  ===================================================== */

  async function refreshActivities() {
    try {
      setRefreshing(true);
      setError("");

      console.log(
        "Actualizando actividades desde Strava..."
      );

      const response = await fetch(
        `${API_URL}/api/strava-activities/import`,
       {
  method: "POST",

  headers: {
    Authorization:
      `Bearer ${localStorage.getItem(
        "viarank_auth_token"
      )}`,
  },
}
      );

      const data = await response.json();

      console.log(
        "IMPORTACIÓN STRAVA:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron importar las actividades"
        );
      }

      alert(
        `Strava respondió correctamente.\n\nActividades encontradas: ${data.stravaActivities}\nActividades importadas: ${data.imported}`
      );

      await loadRanking();
    } catch (err) {
      console.error(
        "Error actualizando actividades:",
        err
      );

      alert(
        "No se pudieron actualizar las actividades desde Strava."
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* =====================================================
     CERRAR SESIÓN
  ===================================================== */

  async function logout() {
const refreshToken =
  localStorage.getItem(
    "viarank_refresh_token"
  );

if (refreshToken) {
  try {
    await fetch(
      `${API_URL}/api/auth/logout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
        }),
      }
    );
  } catch (error) {
    console.error(
      "Error cerrando sesión en el servidor:",
      error
    );
  }
}

    localStorage.removeItem(
  "viarank_auth_token"
);

localStorage.removeItem(
  "viarank_refresh_token"
);

    setConnected(false);
    setUser(null);
    setRanking([]);

    window.location.reload();
  }

  /* =====================================================
     FORMATEAR TIEMPO
  ===================================================== */

  function formatTime(
    seconds: number
  ) {
    const hours = Math.floor(
      seconds / 3600
    );

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }

    return `${minutes} min`;
  }

  
  /* =====================================================
     DEPORTE
  ===================================================== */

  function sportName(
    value: string
  ) {
    switch (value) {
      case "RIDE":
        return "🚴 Ciclismo";

      case "RUN":
        return "🏃 Carrera";

      case "SWIM":
        return "🏊 Natación";

      case "HIKE":
        return "🥾 Senderismo";

      case "WALK":
        return "🚶 Caminata";

      case "KAYAK":
        return "🛶 Kayak";

      case "ROW":
        return "🚣 Remo";

      case "WHEELCHAIR":
        return "♿ Silla de ruedas";

      case "SAIL":
        return "⛵ Vela";

      case "WINDSURF":
        return "🏄 Windsurf";

      default:
        return "Todos los deportes";
    }
  }
  /* =====================================================
     LOADING
  ===================================================== */

  

  /* =====================================================
     PANTALLA SIN CONEXIÓN
  ===================================================== */

  if (sessionRestoring) {
    return (
      <div style={{ ...styles.page, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "white", fontSize: "18px" }}>Iniciando ViaRank...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          ...styles.page,
          minHeight: "100vh",
          backgroundImage: `
  radial-gradient(circle at 75% 20%, rgba(0, 119, 255, 0.32) 0%, transparent 38%),
  radial-gradient(circle at 15% 85%, rgba(255, 94, 0, 0.12) 0%, transparent 32%),
  linear-gradient(135deg, #050b18 0%, #081a35 48%, #06285a 100%)
`,
backgroundSize: "cover",
backgroundPosition: "center",
backgroundRepeat: "no-repeat",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            ...styles.loginCard,
            width: "100%",
            maxWidth: "620px",
            padding: "42px 32px",
            borderRadius: "28px",
            background: "rgba(10, 22, 40, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(10px)",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <img
            src={viarankHeaderLogo}
            alt="ViaRank"
            style={{
              width: "min(330px, 82vw)",
              maxWidth: "100%",
              height: "auto",
              display: "block",
              margin: "0 auto 28px",
            }}
          />

          <h1
            style={{
              margin: "0 0 18px",
              color: "#ffffff",
              fontSize: "clamp(30px, 5vw, 44px)",
              lineHeight: 1.08,
              fontWeight: 800,
            }}
          >
            Tu actividad. Tu comunidad.
          </h1>

                    {emailStep === "request" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxWidth: "420px",
                margin: "0 auto",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#d5dbea",
                  fontSize: "17px",
                  lineHeight: 1.5,
                }}
              >
                Creá tu cuenta o ingresá a ViaRank con tu email.
              </p>
              {emailMode === "register" && (
              <>
              <input
                type="text"
                autoComplete="off"
                placeholder="Nombre"
                value={emailFirstName}
onChange={(e) =>
  setEmailFirstName(e.target.value)
}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "16px",
                   background: "#ffffff",

color: "#111827",
caretColor: "#111827",
                }}
              />

              <input
                type="text"
                autoComplete="off"
                placeholder="Apellido"
               value={emailLastName}
onChange={(e) =>
  setEmailLastName(e.target.value)
}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "16px",
       background: "#ffffff",
color: "#111827",
caretColor: "#111827",
                }}
              />
          </>
           )}
             <input
  type="email"
  autoComplete="email"
placeholder="Email"
value={emailAddress}
onChange={(e) =>
  setEmailAddress(e.target.value)
}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "16px",
                 background: "#ffffff",
color: "#111827",
caretColor: "#111827",
                }}
              />
{emailMode === "register" && (
<select
  value={emailSex}
  onChange={(e) =>
    setEmailSex(
      e.target.value as "MALE" | "FEMALE" | ""
    )
  }
  style={{
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    width: "100%",
    boxSizing: "border-box",
    background: "#0f2f57",
color: "#ffffff",
  }}
>
  <option value="">Seleccioná sexo</option>
  <option value="FEMALE">Femenino</option>
  <option value="MALE">Masculino</option>
</select>
)}
              <button
                
                onClick={requestEmailCode}
disabled={emailLoading}
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "16px",

                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
               {emailLoading
  ? "Enviando..."
  : "Enviar código"}
              </button>
     <button
  type="button"
  onClick={() => {
    setEmailMode(emailMode === "register" ? "login" : "register");
    setEmailMessage("");
  }}
  style={{
    border: "none",
    background: "transparent",
    color: "#ffffff",
    fontSize: "15px",
    cursor: "pointer",
    textDecoration: "underline",
  }}
>
  {emailMode === "register"
    ? "¿Ya tenés una cuenta? Ingresar"
    : "¿No tenés una cuenta? Crear cuenta"}
</button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxWidth: "420px",
                margin: "0 auto",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#d5dbea",
                  fontSize: "17px",
                }}
              >
                Ingresá el código de 6 dígitos.
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Código"
               value={emailCode}
onChange={(e) =>
  setEmailCode(e.target.value)
}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "20px",
                  textAlign: "center",
                  letterSpacing: "6px",
                background: "#ffffff",
color: "#111827",
caretColor: "#111827",
                }}
              />

              <button
               onClick={verifyEmailCode}
disabled={emailLoading}
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {emailLoading
  ? "Verificando..."
  : "Ingresar a ViaRank"}
              </button>
            </div>
          )}

       {emailMessage && (
            <p
              style={{
                margin: "14px 0",
                color: "#ffffff",
                fontSize: "14px",
              }}
            >
              {emailMessage}
            </p>
          )}

               </div>
      </div>
    );
  }
  async function createGroupEvent(
    groupId: string,
    eventData: {
      title: string;
      eventDate: string;
      departureTime: string;
      meetingPlace: string;
      destination: string;
      estimatedReturn: string;
      plannedSpeed: string;
      rules: string;
    }
  ) {
    const response = await fetch(
      `${API_URL}/api/groups/${groupId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
        },
        body: JSON.stringify(eventData),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo guardar el evento");
    }

    return data.event;
  }
  if (selectedGroup) {
    return (
      <GroupPage
        group={selectedGroup}
        ranking={groupRanking}
        loading={groupRankingLoading}
        period={period}
        sexFilter={groupSexFilter}
        profilePicture={user?.profilePicture}
        onCreateEvent={createGroupEvent}
        onPeriodChange={setPeriod}
        onSexFilterChange={setGroupSexFilter}
        onBack={() => {
          setSelectedGroup(null);
          setGroupRanking([]);
        }}
        onOpenAthlete={(athlete) => {
          loadActivityHistory(athlete);
        }}
      />
    );
  }

  if (sportPage) {
      const sportImages: Record<string, string> = {
        RIDE: sportCiclismo,
        RUN: sportCarrera,
        SWIM: sportNatacion,
        HIKE: sportSenderismo,
        WALK: sportCaminata,
        WHEELCHAIR: sportSillaRuedas,
        KAYAK: sportKayak,
        ROW: sportRemo,
        SAIL: sportVela,
        WINDSURF: sportWindsurf,
      };

      const cleanSportName = sportName(sportPage)
        .replace(/^[^\p{L}]+/u, "")
        .trim();

      return (
        <SportPage
          sport={sportPage}
          sportName={cleanSportName}
          sportImage={sportImages[sportPage]}
          athlete={myActivityBySport[sportPage]}
          groups={groups}
          groupsLoading={groupsLoading}
          period={period}
          profilePicture={user?.profilePicture}
          joinCode={joinCode}
          onPeriodChange={setPeriod}
          onJoinCodeChange={setJoinCode}
          onJoin={joinGroup}
          onBack={() => {
            setSportPage(null);
            setSport("");
          }}
          onOpenGroup={(groupId) => {
            loadGroupRanking(groupId);
          }}
        />
      );
    }

  /* =====================================================
     PANTALLA PRINCIPAL
  ===================================================== */

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
            padding: isMobile ? "12px 14px" : "14px 22px",
            marginBottom: "22px",
            background: "#111827",
            borderRadius: "18px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
            flexWrap: isMobile ? "wrap" : "nowrap",
          }}
        >
          {/* LOGO */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={viarankHeaderLogo}
              alt="ViaRank"
              style={{
                width: isMobile ? "190px" : "285px",
                height: isMobile ? "48px" : "58px",
                objectFit: "contain",
                objectPosition: "left center",
                display: "block",
              }}
            />
          </div>
          {/* ZONA DERECHA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: isMobile ? "8px" : "12px",
              marginLeft: "auto",
              flex: isMobile ? "1 1 100%" : "0 1 auto",
              minWidth: 0,
            }}
          >
            {/* ATLETA */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: isMobile ? "0" : "235px",
                padding: "7px 14px 7px 8px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                flex: isMobile ? "1 1 auto" : "0 0 auto",
              }}
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Perfil"
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "#374151",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  👤
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  lineHeight: 1.2,
                }}
              >
                <strong
                  style={{
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.firstName} {user?.lastName}
                </strong>

                <span
                  style={{
                    fontSize: "11px",
                    color: "#cbd5e1",
                    marginTop: "3px",
                  }}
                >
                  Atleta conectado
                </span>
              </div>
            </div>
                       {/* ACTUALIZAR ACTIVIDADES */}
            <button
              onClick={refreshActivities}
              disabled={refreshing}
              title="Actualizar actividades"
              style={{
                width: isMobile ? "48px" : "auto",
                height: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "white",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? "0" : "8px",
                cursor: refreshing ? "default" : "pointer",
                padding: isMobile ? "0" : "0 14px",
                flexShrink: 0,
                opacity: refreshing ? 0.6 : 1,
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "20px", lineHeight: 1 }}>↻</span>
              {!isMobile && (
                <span>
                  {refreshing ? "Actualizando..." : "Actualizar actividades"}
                </span>
              )}
            </button>

            {/* MENU */}
            <div
              style={{
                position: "relative",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Abrir menú"
                style={{
                  position: "relative",
                  zIndex: 102,
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "24px",
                  lineHeight: 1,
                }}
              >
                ☰
              </button>

              {menuOpen && (
                <>
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 100,
                    }}
                  />

                  <div
                    style={{
  position: "absolute",
  right: 0,
  top: "58px",
  width: "190px",
  background: "#071d38",
  borderRadius: "14px",
  padding: "8px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  border: "1px solid #148cff",
  zIndex: 103,
}}
                  >

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setShowCreateGroup(true);

                        window.setTimeout(() => {
                          document
                            .getElementById("mis-grupos-viarank")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        }, 100);
                      }}
                      style={{
                        width: "100%",
                        marginTop: "6px",
                        padding: "10px 12px",
                        border: "none",
                        background: "transparent",
                        borderRadius: "9px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#f8fafc",
                      }}
                    >
                      Crear grupo
                    </button>

                                        <div
                      style={{
                        height: "1px",
                        background: "rgba(20,140,255,0.35)",
                        margin: "4px 8px",
                      }}
                    />
                 <button
  onClick={() => {
    setMenuOpen(false);
    window.location.href = "/registrar-actividad";
  }}
  style={{
    width: "100%",
    padding: "10px 12px",
    border: "none",
    background: "transparent",
    borderRadius: "9px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    color: "#f8fafc",
  }}
>
  Registrar actividad
</button>

<div style={{ height: "1px", background: "rgba(20,140,255,0.35)", margin: "4px 8px" }} />
                 <button
  onClick={() => {
    setMenuOpen(false);
    window.location.href = "/validar-actividad";
  }}
  style={{
    width: "100%",
    padding: "10px 12px",
    border: "none",
    background: "transparent",
    borderRadius: "9px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    color: "#f8fafc",
  }}
>
  Validar actividad
</button>

<div
  style={{
    height: "1px",
    background: "rgba(20,140,255,0.35)",
    margin: "4px 8px",
  }}
/>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        window.location.href = "/support";
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "none",
                        background: "transparent",
                        borderRadius: "9px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#f8fafc",
                      }}
                    >
                      Soporte y privacidad
                    </button>

                    <div
                      style={{
                        height: "1px",
                        background: "rgba(20,140,255,0.35)",
                        margin: "4px 8px",
                      }}
                    />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      style={{
                        width: "100%",
                        marginTop: "6px",
                        padding: "10px 12px",
                        border: "none",
                        background: "transparent",
                        borderRadius: "9px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#f8fafc",
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* PORTADA VIARANK */}

        <section
          style={{
            position: "relative",
            minHeight: isMobile ? "520px" : "500px",
            marginBottom: "26px",
            borderRadius: "22px",
            overflow: "hidden",
            backgroundImage: `linear-gradient(
              90deg,
              rgba(8, 18, 32, 0.84) 0%,
              rgba(8, 18, 32, 0.55) 42%,
              rgba(8, 18, 32, 0.12) 72%
            ), url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
          }}
        >
          {/* TEXTO PORTADA */}

          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: isMobile
                ? "42px 24px 190px"
                : "72px 40px 165px",
              maxWidth: isMobile ? "100%" : "610px",
              color: "#ffffff",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? "38px" : "54px",
                lineHeight: 0.98,
                fontWeight: 900,
                letterSpacing: "-2px",
              }}
            >
              Más que kilómetros,
              <br />
              <span style={{ color: "#ff4f00" }}>
                una comunidad
              </span>
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                maxWidth: "470px",
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: 1.45,
                color: "#e2e8f0",
                fontWeight: 500,
              }}
            >
              Rankings deportivos con actividades validadas.
              <br />
              Competí, entrená y superate.
            </p>

            <div
              style={{
                marginTop: "22px",
                fontSize: isMobile ? "18px" : "22px",
                fontStyle: "italic",
                color: "#ffffff",
                transform: "rotate(-4deg)",
                transformOrigin: "left center",
                display: "inline-block",
                opacity: 0.92,
              }}
            >
              El deporte
              <br />
              nos conecta
            </div>
          </div>

          {/* TARJETAS DEPORTES */}

          <div
            style={{
              position: "absolute",
              left: isMobile ? "14px" : "18px",
              right: isMobile ? "14px" : "18px",
              bottom: isMobile ? "14px" : "18px",
              display: "flex",
              gap: isMobile ? "7px" : "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              zIndex: 3,
            }}
          >
            {[
              ["RIDE", "Ciclismo", "🚴", sportCiclismo],
              ["RUN", "Carrera", "🏃", sportCarrera],
              ["SWIM", "Natación", "🏊", sportNatacion],
              ["HIKE", "Senderismo", "🥾", sportSenderismo],
              ["WALK", "Caminata", "🚶", sportCaminata],
              ["WHEELCHAIR", "Silla de ruedas", "♿", sportSillaRuedas],
              ["KAYAK", "Kayak", "🛶", sportKayak],
              ["ROW", "Remo", "🚣", sportRemo],
              ["SAIL", "Vela", "⛵", sportVela],
              ["WINDSURF", "Windsurf", "🏄", sportWindsurf],
            ].map(([value, name, icon, image]) => (
              <button
                key={value}
                onClick={() => {
                  setSport(value);
                  setSportPage(value);
                  loadGroups(value);
                }}
                style={{
                  width: isMobile ? "82px" : "94px",
                  minWidth: isMobile ? "82px" : "94px",
                  height: isMobile ? "115px" : "135px",
                  position: "relative",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border:
                    sport === value
                      ? "3px solid #ff4f00"
                      : "2px solid rgba(255,255,255,0.75)",
                  background: "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                  boxShadow: "0 5px 14px rgba(0,0,0,0.28)",
                }}
              >
                <img
                  src={image}
                  alt={name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                    transform: "scale(1.25)",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, transparent 0%, transparent 50%, rgba(2,8,18,0.70) 100%)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    left: "8px",
                    bottom: "27px",
                    fontSize: isMobile ? "22px" : "26px",
                    lineHeight: 1,
                    filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.9))",
                  }}
                >
                  {icon}
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: "7px 4px 8px",
                    fontSize:
                      name === "Silla de ruedas"
                        ? "10px"
                        : "11px",
                    lineHeight: 1.05,
                    fontWeight: 800,
                    textAlign: "center",
                    textShadow: "0 2px 3px rgba(0,0,0,0.9)",
                  }}
                >
                  {name}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const styles: {
  [key: string]: React.CSSProperties;
} = {
 page: {
  minHeight: "100vh",
  background: "#ffffff",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  color: "#f8fafc",
},

  container: {
  maxWidth: "1100px",
  margin: "24px auto",
  padding: "30px 20px 50px",
  background: "#071a33",
  borderRadius: "24px",
  boxShadow: "0 20px 60px rgba(7, 26, 51, 0.18)",
},

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    background: "#f5f7fb",
  },

  loginCard: {
    width: "min(90%, 430px)",
    margin: "120px auto",
    padding: "45px 30px",
    background: "#ffffff",
    borderRadius: "22px",
    textAlign: "center",
    boxShadow:
      "0 15px 50px rgba(0,0,0,0.10)",
  },

  bigLogo: {
    fontSize: "60px",
    marginBottom: "10px",
  },

  logo: {
    fontSize: "30px",
    fontWeight: "800",
    letterSpacing: "-1px",
  },

  title: {
    fontSize: "42px",
    margin: "10px 0",
  },

  subtitle: {
    fontSize: "20px",
    color: "#667085",
    marginTop: "0",
  },

  description: {
    color: "#667085",
    lineHeight: 1.6,
    margin:
      "25px auto 30px",
    maxWidth: "330px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  headerSubtitle: {
  color: "#667085",
  marginTop: "-2px",
  marginLeft: "62px",
  width: "148px",
  textAlign: "center",
  fontFamily: "Verdana, Arial, sans-serif",
  fontSize: "13px",
  letterSpacing: "-0.5px",
  transform: "scaleY(0.78)",
  transformOrigin: "center top",
  whiteSpace: "nowrap",
},

  userHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  connected: {
    fontSize: "14px",
    fontWeight: "600",
  },

  logoutButton: {
    border: "none",
    background: "#ffffff",
    color: "#667085",
    padding: "9px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  profileCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.06)",
    marginBottom: "20px",
  },

  profileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  profileImage: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    objectFit: "cover",
  },

  profilePlaceholder: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "#eef2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
  },

  profileName: {
    margin: "0 0 5px",
    fontSize: "22px",
  },

  profileText: {
    margin: 0,
    color: "#667085",
  },

  refreshButton: {
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  filtersCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    gap: "20px",
    marginBottom: "30px",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.05)",
  },

  filterLabel: {
    margin:
      "0 0 7px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#667085",
    letterSpacing: "1px",
  },

  select: {
    minWidth: "210px",
    padding: "11px 13px",
    border:
      "1px solid #d0d5dd",
    borderRadius: "9px",
    background: "#ffffff",
    fontSize: "14px",
    cursor: "pointer",
  },

  rankingTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },

  rankingTitle: {
    margin: 0,
    fontSize: "27px",
  },

  rankingSubtitle: {
    margin:
      "5px 0 0",
    color: "#667085",
  },

  countBadge: {
    background: "#ffffff",
    padding: "8px 13px",
    borderRadius: "20px",
    fontSize: "13px",
    color: "#667085",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.05)",
  },

  rankingList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  athleteCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "17px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.05)",
  },

  topAthlete: {
    boxShadow:
      "0 6px 25px rgba(0,0,0,0.09)",
  },

  position: {
    width: "50px",
    minWidth: "50px",
    textAlign: "center",
  },

  athleteImage: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    objectFit: "cover",
  },

  athletePlaceholder: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    background: "#eef2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
  },

  athleteMain: {
    flex: 1,
    minWidth: "180px",
  },

  athleteName: {
    margin: 0,
    fontSize: "18px",
  },

  athleteActivities: {
    margin:
      "5px 0 0",
    color: "#667085",
    fontSize: "13px",
  },

  stats: {
    display: "flex",
    gap: "25px",
    alignItems: "center",
  },

  stat: {
    display: "flex",
    flexDirection: "column",
    textAlign: "right",
  },

  statStrong: {},

  statSpan: {},

  error: {
    background: "#fff1f2",
    color: "#b42318",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px",
  },

  emptyCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "50px 20px",
    textAlign: "center",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  footer: {
    marginTop: "45px",
    paddingTop: "25px",
    borderTop:
      "1px solid #dfe3e8",
    display: "flex",
    justifyContent: "space-between",
    color: "#667085",
    fontSize: "13px",
  },
};

export default App;










