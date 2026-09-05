import { useEffect, useState } from "react";
import LoginButton from "./components/LoginButton";
import viarankLogo from "./assets/viarank-logo.png";
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
function getWeatherIcon(code: number) {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";

  return "🌤️";
}
function App() {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [location, setLocation] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);
const [weather, setWeather] = useState<any>(null);
  useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
useEffect(() => {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      console.error("No se pudo obtener la ubicación:", error);
    }
  );
}, []);
useEffect(() => {
  if (!location) {
    return;
  }

  const loadWeather = async () => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
      );

      const data = await response.json();

      setWeather(data);
    } catch (error) {
      console.error("No se pudo obtener el pronóstico:", error);
    }
  };

  loadWeather();
}, [location]);
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
const [groups, setGroups] = useState<
  SportGroup[]
>([]);

const [groupsLoading, setGroupsLoading] =
  useState(false);

const [groupSearch, setGroupSearch] =
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

      const response = await fetch(url);

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

async function loadGroups() {
  try {
    setGroupsLoading(true);

    const params =
      new URLSearchParams();

    if (groupSearch.trim()) {
      params.set(
        "search",
        groupSearch.trim()
      );
    }

    const url =
      `${API_URL}/api/groups` +
      (params.toString()
        ? `?${params.toString()}`
        : "");

    const response =
      await fetch(url);

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
        return "🏃 Running";

      case "SWIM":
        return "🏊 Natación";

      case "HIKE":
        return "🥾 Senderismo";

      case "WALK":
        return "🚶 Caminata";

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
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <div style={styles.bigLogo}>
            🏆
          </div>

          <h1 style={styles.title}>
            ViaRank
          </h1>

          <p style={styles.subtitle}>
            Clasificación Deportiva
          </p>

          <p style={styles.description}>
            Conectá tu cuenta de Strava
            para participar en los
            rankings deportivos.
          </p>

          <LoginButton />
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
    ...styles.header,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
  }}
>
          <div>
          <div style={styles.logo}>
  <img
    src={viarankLogo}
    alt="ViaRank"
    style={{
      width: "155px",
      height: "auto",
      objectFit: "contain",
      display: "block",
    }}
  />
</div>
            
          </div>
           <div
  style={{
    display: "none",
    textAlign: "center",
    padding: "8px 16px",
  }}
>
  <div
    style={{
      fontSize: "12px",
      fontWeight: 700,
    }}
  >
    PRONÓSTICO DEL TIEMPO
  </div>

  <div
    style={{
      fontSize: "13px",
      marginTop: "4px",
      lineHeight: isMobile ? "1.8" : "normal",
    }}
  >
    {weather?.daily?.time?.map((date: string, index: number) => (
  <span
    key={date}
    style={{ whiteSpace: "nowrap" }}
  >
    {index === 0
      ? "Hoy"
      : index === 1
      ? "Mañana"
      : new Date(`${date}T12:00:00`).toLocaleDateString("es-AR", {
          weekday: "short",
        })}
    {" "}
   {getWeatherIcon(weather.daily.weather_code[index])}{" "}
    {Math.round(weather.daily.temperature_2m_max[index])}° /{" "}
    {Math.round(weather.daily.temperature_2m_min[index])}°
    {index < weather.daily.time.length - 1 ? " · " : ""}
  </span>
))}
  </div>

     <div
  style={{
    fontSize: "10px",
    marginTop: "4px",
    opacity: 0.7,
  }}
>
 Datos meteorológicos: Open-Meteo
</div>

</div>
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginLeft: isMobile ? "0" : "auto",
  }}
>
<button
  onClick={refreshActivities}
  disabled={refreshing}
  style={{
    padding: "6px 10px",
fontSize: "13px",
    borderRadius: "10px",
    border: "1px solid #d9dee8",
    background: "white",
    fontWeight: 600,
    cursor: refreshing ? "default" : "pointer",
    whiteSpace: "nowrap",
  }}
>
  {refreshing ? "⏳ Actualizando..." : "🔄 Actualizar Strava"}
</button>
<div
  style={{
    ...styles.userHeader,
    marginLeft: isMobile ? "0" : "auto",
    justifyContent: isMobile ? "center" : "flex-end",
    gap: "10px",
  }}
>
  {user?.profilePicture ? (
    <img
      src={user.profilePicture}
      alt="Perfil"
      style={{
        width: "48px",
height: "48px",
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  ) : (
    <div style={styles.profilePlaceholder}>
      👤
    </div>
  )}

  <div
    style={{
      display: "flex",
      flexDirection: "column",
      lineHeight: 1.15,
    }}
  >
    <strong
  style={{
    fontSize: "20px",
    fontWeight: 700,
  }}
>
  {user?.firstName} {user?.lastName}
</strong>

    <span
      style={{
        fontSize: "12px",
        opacity: 0.7,
      }}
    >
      Atleta conectado
    </span>
  </div>

  <span
  onClick={logout}
  style={{
    fontSize: "22px",
    marginLeft: "4px",
    cursor: "pointer",
  }}
>
  ⌄
⌄
</span>
</div>
</div>

</header>

        {/* PERFIL */}

        <section
  style={{
    ...styles.profileCard,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
  }}
>
          <div style={styles.profileInfo}>

            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Perfil"
                style={styles.profileImage}
              />
            ) : (
              <div style={styles.profilePlaceholder}>
                👤
              </div>
            )}

            <div>
              <h2 style={styles.profileName}>
                {user?.firstName}{" "}
                {user?.lastName}
              </h2>

              <p style={styles.profileText}>
                Atleta conectado con
                Strava
              </p>
            </div>
          </div>

          <button
            style={styles.refreshButton}
            onClick={refreshActivities}
            disabled={refreshing}
          >
            {refreshing
              ? "⏳ Actualizando..."
              : "🔄 Actualizar Strava"}
          </button>
        </section>
        {/* GRUPOS */}

        <section
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
          {/* BUSCAR GRUPO */}

         <div
  style={{
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: "10px",
    marginBottom: "16px",
  }}
>
            <input
              type="text"
              value={groupSearch}
              onChange={(e) =>
                setGroupSearch(
                  e.target.value
                )
              }
              placeholder="Buscar grupo por nombre"
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border:
                  "1px solid #cbd5e1",
              }}
            />

            <button
              onClick={() => loadGroups()}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 700,
               width: isMobile ? "100%" : "auto",
               background: isMobile ? "#f1f5f9" : "transparent",
              }}
            >
              Buscar
            </button>
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
          <button
  onClick={() =>
    setShowCreateGroup(
      !showCreateGroup
    )
  }
  style={{
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
    marginBottom: "12px",
  }}
>
  {showCreateGroup
    ? "Cerrar"
    : "CREAR UN GRUPO"}
</button>
          {/* LISTA DE GRUPOS */}

          {groupsLoading ? (
            <p>
              Cargando grupos...
            </p>
          ) : groups.length === 0 ? (
            <p
              style={{
                color: "#64748b",
              }}
            >
              No se encontraron grupos.
            </p>
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
    style={{
      padding: "12px 18px",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 700,
      width: isMobile ? "100%" : "auto",
      background: isMobile ? "#f1f5f9" : "transparent",
    }}
  >
    Ver ranking
  </button>

  {canManageGroup(group) && (
    <>
      <button
        onClick={() => {
          loadGroupMembers(group);
        }}
        style={{
          padding: "12px 18px",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: 700,
          width: isMobile ? "100%" : "auto",
          background: isMobile ? "#f1f5f9" : "transparent",
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
        style={{
          padding: "12px 18px",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: 700,
          width: isMobile ? "100%" : "auto",
          background: isMobile ? "#f1f5f9" : "transparent",
        }}
      >
        Eliminar grupo
      </button>
    </>
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
              borderRadius: "12px",
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
              DEPORTE
            </p>

            <select
              value={sport}
              onChange={(e) =>
                setSport(e.target.value)
              }
              style={styles.select}
            >
              <option value="">
                Elegir deporte
              </option>

            <option value="WALK">
  Caminata
</option>

<option value="RIDE">
  Ciclismo
</option>

<option value="RUN">
  Carrera
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
          </div>

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

        <section>
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








