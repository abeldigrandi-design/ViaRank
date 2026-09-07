import { useEffect, useState } from "react";
import LoginButton from "./components/LoginButton";
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
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
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
  const [ranking, setRanking] = useState<
    RankingAthlete[]
  >([]);

  const [sport, setSport] = useState("");
  const [period, setPeriod] = useState("month");
  const [menuOpen, setMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
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

const [groupRankingLoading, setGroupRankingLoading] =
  useState(false);

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
  /* =====================================================
     COMPROBAR CONEXIÓN CON STRAVA
  ===================================================== */

  useEffect(() => {
    checkStrava();
  }, []);

  /* =====================================================
     CARGAR RANKING
  ===================================================== */

 useEffect(() => {
  if (connected) {
    loadRanking();
    loadGroups();
  }
}, [connected, sport, period]);

useEffect(() => {
  if (selectedGroup) {
    loadGroupRanking(selectedGroup.id);
  }
}, [period]);
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

      if (data.connected) {
        setConnected(true);
        setUser(data.user);
      } else {
        setConnected(false);
        setUser(null);
      }
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

  function logout() {
  
    localStorage.removeItem(
      "viarank_auth_token"
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
     MEDALLA
  ===================================================== */

  function getMedal(
    position: number
  ) {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";

    return `#${position}`;
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

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.logo}>
          🏆 ViaRank
        </div>

        <p>
          Comprobando conexión con
          Strava...
        </p>
      </div>
    );
  }

  /* =====================================================
     PANTALLA SIN CONEXIÓN
  ===================================================== */

  if (!connected) {
    return (
      <div
        style={{
          ...styles.page,
          minHeight: "100vh",
          backgroundImage: `linear-gradient(
            rgba(7, 18, 35, 0.52),
            rgba(7, 18, 35, 0.72)
          ), url(${heroImage})`,
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

          <p
            style={{
              margin: "0 auto 30px",
              maxWidth: "470px",
              color: "#d5dbea",
              fontSize: "18px",
              lineHeight: 1.6,
            }}
          >
            Conectá tu cuenta de Strava para seguir tu actividad
            y compartirla con tu comunidad deportiva.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <LoginButton />
          </div>

          <p
            style={{
              margin: "18px 0 0",
              color: "#aeb8c8",
              fontSize: "14px",
            }}
          >
            Es rápido, seguro y oficial.
          </p>
        </div>
      </div>
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
                height: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "white",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: refreshing ? "default" : "pointer",
                padding: "0 14px",
                flexShrink: 0,
                opacity: refreshing ? 0.6 : 1,
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "20px", lineHeight: 1 }}>↻</span>
              <span>{refreshing ? "Actualizando..." : "Actualizar actividades"}</span>
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
                      background: "white",
                      borderRadius: "14px",
                      padding: "8px",
                      boxShadow: "0 12px 30px rgba(15,23,42,0.22)",
                      border: "1px solid #e5e7eb",
                      zIndex: 103,
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        fontSize: "13px",
                        color: "#64748b",
                        borderBottom: "1px solid #eef2f7",
                      }}
                    >
                      {user?.firstName} {user?.lastName}
                    </div>

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
                        color: "#111827",
                      }}
                    >
                      Crear grupo
                    </button>

                    <div
                      style={{
                        height: "1px",
                        background: "#eef2f7",
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
                        color: "#111827",
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
              Rankings deportivos conectados con Strava.
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
            ].map(([value, name, , image]) => (
              <button
                key={value}
                onClick={() => {
                  setSport(value);
                  window.setTimeout(() => {
                    document
                      .getElementById("ranking-viarank")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  }, 100);
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
                  backgroundImage: `linear-gradient(
                    180deg,
                    rgba(0,0,0,0.02) 0%,
                    rgba(0,0,0,0.12) 48%,
                    rgba(0,0,0,0.76) 100%
                  ), url(${image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "#ffffff",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                  boxShadow: "0 5px 14px rgba(0,0,0,0.28)",
                }}
              >

                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    minHeight: "30px",
                    padding: "7px 4px",
                    background: "rgba(5,15,25,0.88)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize:
                      name === "Silla de ruedas"
                        ? "10px"
                        : "11px",
                    lineHeight: 1.05,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {name}
                </div>
              </button>
            ))}
          </div>
        </section>
        {/* GRUPOS */}

        <section
          id="mis-grupos-viarank"
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "24px",
                }}
              >
                Mis grupos
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                }}
              >
                Competencias internas de ViaRank
              </p>
            </div>

            <button
              onClick={() => loadGroups()}
              disabled={groupsLoading}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {groupsLoading
                ? "Cargando..."
                : "Actualizar grupos"}
            </button>
          </div>
{/* CREAR GRUPO */}

<div
  style={{
display: showCreateGroup
  ? "block"
  : "none",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "20px",
  }}
>
  <h3
    style={{
      margin: "0 0 14px",
      fontSize: "18px",
    }}
  >
    Crear grupo
  </h3>

  <div
    style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <input
      type="text"
      value={newGroupName}
      onChange={(e) =>
        setNewGroupName(
          e.target.value
        )
      }
      placeholder="Nombre del grupo"
      style={{
        flex: 1,
        minWidth: "220px",
        padding: "12px",
        borderRadius: "10px",
        border:
          "1px solid #cbd5e1",
      }}
    />

    <select
      value={newGroupSport}
      onChange={(e) =>
        setNewGroupSport(
          e.target.value
        )
      }
      style={{
        minWidth: "170px",
        padding: "12px",
        borderRadius: "10px",
        border:
          "1px solid #cbd5e1",
        background: "#ffffff",
      }}
    >
     <option value="WALK">
  Caminata
</option>

<option value="RUN">
  Carrera
</option>

<option value="RIDE">
  Ciclismo
</option>

<option value="KAYAK">
  Kayak
</option>

<option value="SWIM">
  Natación
</option>

<option value="ROW">
  Remo
</option>

<option value="HIKE">
  Senderismo
</option>

<option value="WHEELCHAIR">
  Silla de ruedas
</option>

<option value="SAIL">
  Vela
</option>

<option value="WINDSURF">
  Windsurf
</option>
    </select>

    <select
      value={newGroupVisibility}
      onChange={(e) =>
        setNewGroupVisibility(
          e.target.value
        )
      }
      style={{
        minWidth: "170px",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid #cbd5e1",
        background: "#ffffff",
      }}
    >
      <option value="PUBLIC">Público</option>
      <option value="PRIVATE">Privado</option>
    </select>

    <button
      onClick={createGroup}
      disabled={creatingGroup}
      style={{
        padding: "12px 20px",
        border: "none",
        borderRadius: "10px",
        cursor:
          creatingGroup
            ? "not-allowed"
            : "pointer",
        fontWeight: 700,
      }}
    >
      {creatingGroup
        ? "Creando..."
        : "Crear grupo"}
    </button>
  </div>
</div>
        {/* ELEGIR DEPORTE */}

<div
  style={{
    marginBottom: "16px",
  }}
>
  <select
    value={groupSportFilter}
    onChange={(e) => {
  const sport = e.target.value;
  setGroupSportFilter(sport);
  loadGroups(sport);
}}
    style={{
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      cursor: "pointer",
    }}
  >
    <option value="">
      Elegir deporte
    </option>
    <option value="RIDE">Ciclismo</option>
    <option value="RUN">Carrera</option>
    <option value="SWIM">Natación</option>
    <option value="HIKE">Senderismo</option>
    <option value="WALK">Caminata</option>
    <option value="WHEELCHAIR">Silla de ruedas</option>
    <option value="KAYAK">Kayak</option>
    <option value="ROW">Remo</option>
    <option value="SAIL">Vela</option>
    <option value="WINDSURF">Windsurf</option>
  </select>
</div>

          {/* ENTRAR CON CÓDIGO */}

          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(
                  e.target.value
                )
              }
              placeholder="Código del grupo"
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border:
                  "1px solid #cbd5e1",
                textTransform:
                  "uppercase",
              }}
            />

            <button
              onClick={joinGroup}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Unirme
            </button>
          </div>
          
          {/* LISTA DE GRUPOS */}

          {groupsLoading ? (
  <p>
    Cargando grupos...
  </p>
) : groups.length === 0 ? (
  groupSportFilter ? (
    <p
      style={{
        color: "#64748b",
      }}
    >
      No hay grupos públicos en este deporte.
    </p>
  ) : null
) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {groups.map(
                (group) => (
                  <div
                    key={group.id}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "14px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent:
                        "space-between",
                      alignItems:
  isMobile ? "stretch" : "center",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin:
                            "0 0 6px",
                        }}
                      >
                        {group.name}
                      </h3>

                      <div
                        style={{
                          color:
                            "#64748b",
                          marginBottom:
                            "5px",
                        }}
                      >
                        {sportName(
                          group.sport
                        )}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "14px",
                        }}
                      >
                        Atletas:{" "}
                        <strong>
                          {group._count
                            ?.members ??
                            0}
                        </strong>
                      </div>

                      <div
                        style={{
                          fontSize:
                            "14px",
                          marginTop:
                            "4px",
                        }}
                      >
                        Código:{" "}
                        <strong>
                          {
                            group.joinCode
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          fontSize:
                            "13px",
                          color:
                            "#64748b",
                          marginTop:
                            "4px",
                        }}
                      >
                        Administrador:{" "}
                        {
                          group
                            .administrator
                            .firstName
                        }{" "}
                        {
                          group
                            .administrator
                            .lastName
                        }
                      </div>
                    </div>

                    <div
  style={{
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: "8px",
    width: isMobile ? "100%" : "auto",
  }}
>
  <button
  onClick={() => {
    loadGroupRanking(group.id);
  }}
  onPointerDown={(e) => {
    e.currentTarget.style.transform = "scale(0.94)";
  }}
  onPointerUp={(e) => {
    e.currentTarget.style.transform = "scale(1)";
  }}
  onPointerLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
  }}
  style={{
      padding: "12px 18px",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 700,
      width: isMobile ? "100%" : "auto",
      background: isMobile ? "#f1f5f9" : "transparent",
transition: "transform 0.12s ease, background 0.12s ease",
transform: "scale(1)",
boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    }}
  >
    Ver ranking
  </button>

  {canManageGroup(group) && (
  <div
    style={{
      display: "flex",
      gap: "6px",
      justifyContent: isMobile ? "flex-end" : "flex-start",
      flexWrap: "wrap",
    }}
  >
    <button
      onClick={() => {
        loadGroupMembers(group);
      }}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = "scale(0.94)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerCancel={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      style={{
        padding: isMobile ? "6px 9px" : "7px 11px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: isMobile ? "11px" : "12px",
        width: "auto",
        background: "#ffffff",
        color: "#475569",
        transition: "transform 0.12s ease, background 0.12s ease",
        transform: "scale(1)",
        touchAction: "manipulation",
      }}
    >
      Administrar grupo
    </button>

    <button
      onClick={() =>
        deleteGroup(
          group.id,
          group.name
        )
      }
      onPointerDown={(e) => {
        e.currentTarget.style.transform = "scale(0.94)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerCancel={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      style={{
        padding: isMobile ? "6px 9px" : "7px 11px",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: isMobile ? "11px" : "12px",
        width: "auto",
        background: "#ffffff",
        color: "#b91c1c",
        transition: "transform 0.12s ease, background 0.12s ease",
        transform: "scale(1)",
        touchAction: "manipulation",
      }}
    >
      Eliminar grupo
    </button>
  </div>
)}
</div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
        {/* ADMINISTRAR GRUPO */}

{adminGroup && (
  <section
    style={{
      background: "#ffffff",
      borderRadius: "18px",
      padding: "24px",
      marginBottom: "24px",
      boxShadow:
        "0 8px 24px rgba(0,0,0,0.08)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        marginBottom: "20px",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "26px",
          }}
        >
          Administrar {adminGroup.name}
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#64748b",
          }}
        >
          Código: {adminGroup.joinCode}
        </p>

        <select
          value={adminGroup.visibility}
          onChange={async (e) => {
            const visibility = e.target.value as "PUBLIC" | "PRIVATE";
            const response = await fetch(`${API_URL}/api/groups/${adminGroup.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
              },
              body: JSON.stringify({ visibility }),
            });
            const data = await response.json();
            if (!response.ok) {
              alert(data.error || "No se pudo actualizar la privacidad");
              return;
            }
            setAdminGroup(data.group);
            await loadGroups();
          }}
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontWeight: 600,
          }}
        >
          <option value="PUBLIC">Público</option>
          <option value="PRIVATE">Privado</option>
        </select>
      </div>

      <button
        onClick={() => {
          setAdminGroup(null);
          setGroupMembers([]);
        }}
        style={{
          padding: "10px 16px",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Cerrar
      </button>
    </div>

    {groupMembersLoading ? (
      <p>Cargando miembros...</p>
    ) : groupMembers.length === 0 ? (
      <p>No hay miembros en este grupo.</p>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {groupMembers.map((member) => (
          <div
            key={member.membershipId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "14px",
              border:
                "1px solid #e2e8f0",
              borderRadius: "14px",
            }}
          >
            {member.user.profilePicture ? (
              <img
                src={member.user.profilePicture}
                alt={`${member.user.firstName} ${member.user.lastName}`}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {"\u{1F464}"}
              </div>
            )}

            <div
              style={{
                flex: 1,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                }}
              >
                {member.user.firstName}{" "}
                {member.user.lastName}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginTop: "3px",
                }}
              >
                {member.user.isGroupAdministrator
                  ? "Administrador del grupo"
                  : "Atleta"}
              </div>
            </div>

            {!member.user.isGroupAdministrator && (
              <button
                onClick={() =>
                  removeGroupMember(
                    member.user.id,
                    `${member.user.firstName} ${member.user.lastName}`
                  )
                }
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderRadius: "9px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Quitar atleta
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </section>
)}
        {/* FILTROS */}

        <section
  style={{
    ...styles.filtersCard,
    flexDirection: isMobile ? "column" : "row",
  }}
>
          

          <div>
            <p style={styles.filterLabel}>
              PERÍODO
            </p>

            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              style={styles.select}
            >
              <option value="">
                Total acumulado
              </option>

              <option value="week">
                Semana en curso
              </option>

              <option value="month">
                Mes en curso
              </option>

              <option value="year">
                Año en curso
              </option>
            </select>
          </div>
        </section>
{/* RANKING INTERNO DEL GRUPO */}

{selectedGroup && (
  <section
    style={{
      background: "#ffffff",
      borderRadius: "18px",
      padding: "24px",
      marginBottom: "24px",
      boxShadow:
        "0 8px 24px rgba(0,0,0,0.08)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        marginBottom: "22px",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "28px",
          }}
        >
          {"\u{1F3C6}"} {selectedGroup.name}
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#64748b",
          }}
        >
          {sportName(selectedGroup.sport)}
          {" · "}
          {selectedGroup.members} atletas
        </p>
      </div>

      <button
        onClick={() => {
          setSelectedGroup(null);
          setGroupRanking([]);
        }}
        style={{
          padding: "10px 16px",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Cerrar ranking
      </button>
    </div>

    {groupRankingLoading ? (
      <p>Cargando ranking del grupo...</p>
    ) : groupRanking.length === 0 ? (
      <p>
        Todavía no hay actividades para este grupo.
      </p>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
      {groupRanking.map((athlete) => {
  const isTopThree =
    athlete.position <= 3;

  return (
    <div
      key={athlete.userId}
      style={{
        background: isTopThree
          ? "#fff7ed"
          : "#ffffff",
        border: isTopThree
          ? "2px solid #f97316"
          : "1px solid #e2e8f0",
        borderRadius: isTopThree
          ? "14px"
          : "12px",
        padding: isMobile
          ? "10px 12px"
          : "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: isMobile
          ? "8px"
          : "12px",
        minHeight: isTopThree
          ? "78px"
          : "64px",
      }}
    >
      <div
        style={{
          minWidth: isMobile
            ? "34px"
            : "42px",
          fontSize: isTopThree
            ? isMobile
              ? "24px"
              : "28px"
            : isMobile
            ? "17px"
            : "19px",
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        {athlete.position === 1
          ? "\u{1F947}"
          : athlete.position === 2
          ? "\u{1F948}"
          : athlete.position === 3
          ? "\u{1F949}"
          : `${athlete.position}\u00BA`}
      </div>

      {athlete.profilePicture ? (
        <img
          src={athlete.profilePicture}
          alt={`${athlete.firstName} ${athlete.lastName}`}
          style={{
            width: isTopThree
              ? "48px"
              : "42px",
            height: isTopThree
              ? "48px"
              : "42px",
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: isTopThree
              ? "48px"
              : "42px",
            height: isTopThree
              ? "48px"
              : "42px",
            borderRadius: "50%",
            background: "#e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          {"\u{1F464}"}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: isMobile
              ? "15px"
              : "17px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {athlete.firstName}{" "}
          {athlete.lastName}
        </div>

        <div
          style={{
            color: "#64748b",
            fontSize: isMobile
              ? "12px"
              : "13px",
            marginTop: "2px",
          }}
        >
          {athlete.activities} actividades
        </div>
      </div>

      <div
        style={{
          textAlign: "right",
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: isMobile
              ? "16px"
              : "19px",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {athlete.distanceKm.toLocaleString(
            "es-AR"
          )}{" "}
          km
        </div>

        <div
          style={{
            color: "#64748b",
            fontSize: isMobile
              ? "11px"
              : "12px",
            marginTop: "2px",
            whiteSpace: "nowrap",
          }}
        >
          {athlete.hours.toLocaleString(
            "es-AR"
          )}{" "}
          h ·{" "}
          {athlete.elevationGain.toLocaleString(
            "es-AR"
          )}{" "}
          m
        </div>
      </div>
    </div>
  );
})}
      </div>
    )}
  </section>
)}
        {/* RANKING */}
{!selectedGroup && (
        <section id="ranking-viarank">
          <div style={styles.rankingTitleRow}>
            <div>
              <h2 style={styles.rankingTitle}>
                🏆 Ranking
              </h2>

              <p style={styles.rankingSubtitle}>
                {sport
                  ? sportName(sport)
                  : "Todos los deportes"}
                {" · "}
                {period === "week"
                  ? "Semana en curso"
                  : period === "month"
                  ? "Mes en curso"
                  : period === "year"
                  ? "Último año"
                  : "Todo"}
              </p>
            </div>

            <div style={styles.countBadge}>
              {ranking.length} atletas
            </div>
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {ranking.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>
                🏃
              </div>

              <h3>
                Todavía no hay atletas
              </h3>

              <p>
                No hay actividades para
                los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div style={styles.rankingList}>
              {ranking.map(
                (athlete) => (
                  <div
                    key={athlete.userId}
                    style={{
                      ...styles.athleteCard,
                      flexWrap: isMobile ? "wrap" : "nowrap",
                      ...(athlete.position <=
                      3
                        ? styles.topAthlete
                        : {}),
                    }}
                  >

                    {/* POSICIÓN */}

                    <div style={styles.position}>
                      <span
                        style={{
                          fontSize:
                            athlete.position <=
                            3
                              ? "32px"
                              : "20px",
                        }}
                      >
                        {getMedal(
                          athlete.position
                        )}
                      </span>
                    </div>

                    {/* FOTO */}

                    {athlete.profilePicture ? (
                      <img
                        src={
                          athlete.profilePicture
                        }
                        alt={`${athlete.firstName} ${athlete.lastName}`}
                        style={
                          styles.athleteImage
                        }
                      />
                    ) : (
                      <div
                        style={
                          styles.athletePlaceholder
                        }
                      >
                        👤
                      </div>
                    )}

                    {/* NOMBRE */}

                    <div style={styles.athleteMain}>
                      <h3
                        style={
                          styles.athleteName
                        }
                      >
                        {athlete.firstName}{" "}
                        {athlete.lastName}
                      </h3>

                      <p
                        style={
                          styles.athleteActivities
                        }
                      >
                        {athlete.activities}{" "}
                        actividades
                      </p>
                    </div>

                    {/* ESTADÍSTICAS */}

                    <div
  style={{
    ...styles.stats,
    gap: isMobile ? "12px" : "25px",
    flexWrap: isMobile ? "wrap" : "nowrap",
    justifyContent: isMobile ? "space-between" : "initial",
    width: isMobile ? "100%" : "auto",
  }}
>

                      <div style={styles.stat}>
                        <strong>
                          {athlete.distanceKm.toLocaleString(
                            "es-AR",
                            {
                              minimumFractionDigits:
                                2,
                            }
                          )}
                        </strong>

                        <span>
                          km
                        </span>
                      </div>

                      <div style={styles.stat}>
                        <strong>
                          {formatTime(
                            athlete.movingTime
                          )}
                        </strong>

                        <span>
                          tiempo
                        </span>
                      </div>

                      <div style={styles.stat}>
                        <strong>
                          {Math.round(
                            athlete.elevationGain
                          ).toLocaleString(
                            "es-AR"
                          )}
                        </strong>

                        <span>
                          m desnivel
                        </span>
                      </div>

                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
)}
        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            🏆 ViaRank
          </strong>

          <span>
            Competí. Entrená. Subí en
            el ranking.
          </span>
        </footer>
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
    background:
      "linear-gradient(135deg, #f5f7fb 0%, #eef2f7 100%)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#18202a",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "30px 20px 50px",
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










