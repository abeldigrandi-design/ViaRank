import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";

export type SportPageAthlete = {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  distanceKm: number;
};

export type SportPageGroup = {
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
  upcomingEvent?: {
    id: string;
    title: string;
    eventDate: string;
    departureTime: string;
  } | null;
};

type Props = {
  sport: string;
  sportName: string;
  sportImage: string;
  athlete?: SportPageAthlete;
  groups: SportPageGroup[];
  groupsLoading: boolean;
  period: string;
  profilePicture?: string | null;
  user?: any;
  canAccessGroupAdmin: boolean;
  isSuperAdmin: boolean;
  onCreateGroup: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  joinCode: string;
  onPeriodChange: (period: string) => void;
  onJoinCodeChange: (code: string) => void;
  onJoin: () => void;
  onBack: () => void;
  onOpenSport: (sport: string) => void;
  onOpenGroup: (groupId: string) => void;
};

const sportIcons: Record<string, string> = {
  RIDE: "🚴",
  RUN: "🏃",
  SWIM: "🏊",
  HIKE: "🥾",
  WALK: "🚶",
  WHEELCHAIR: "♿",
  KAYAK: "🛶",
  ROW: "🚣",
  SAIL: "⛵",
  WINDSURF: "🏄",
};

const menuItemStyle: CSSProperties = {
  width: "100%",
  border: 0,
  borderBottom: "1px solid rgba(20,140,255,.18)",
  background: "transparent",
  color: "#eaf4ff",
  textAlign: "left",
  padding: "11px 10px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 750,
  cursor: "pointer",
};

export default function SportPage({
  sport,
  sportName,
  sportImage,
  athlete,
  groups,
  groupsLoading,
  period,
  profilePicture,
  user,
  canAccessGroupAdmin,
  isSuperAdmin,
  onCreateGroup,
  onOpenAdmin,
  onLogout,
  joinCode,
  onPeriodChange,
  onJoinCodeChange,
  onJoin,
  onBack,
  onOpenSport,
  onOpenGroup,
}: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const myGroups = groups.filter((group) => group.isMember);
  const publicGroups = groups.filter(
    (group) => group.visibility === "PUBLIC" && !group.isMember
  );

  const row: CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minHeight: "58px",
    padding: "9px 12px",
    background: "linear-gradient(90deg, #0a3155, #082845)",
    border: "1px solid rgba(20,140,255,.48)",
    borderRadius: "12px",
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0b3559 0%, #061a30 36%, #041426 100%)",
        color: "#f8fafc",
        padding: "12px 12px 95px",
        boxSizing: "border-box",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "620px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            height: "54px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            marginBottom: "7px",
          }}
        >
          <button
            onClick={onBack}
            style={{
              justifySelf: "start",
              border: 0,
              background: "transparent",
              color: "#e7f2ff",
              padding: 0,
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ‹ Atrás
          </button>

          <img
            src={viarankHeaderLogo}
            alt="ViaRank"
            style={{
              width: "120px",
              height: "38px",
              objectFit: "contain",
              display: "block",
            }}
          />

          <div
            style={{
              justifySelf: "end",
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "43px",
                height: "43px",
              }}
            >
              <div
                style={{
                  width: "43px",
                  height: "43px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #1594ff",
                  background: "#153d60",
                  boxSizing: "border-box",
                }}
              >
                {profilePicture && (
                  <img
                    src={profilePicture}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  position: "absolute",
                  right: "-1px",
                  bottom: "1px",
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  background: "#19df66",
                  border: "2px solid #061a30",
                }}
              />
            </div>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Abrir menú"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "11px",
                border: "1px solid rgba(20,140,255,.7)",
                background: "#071d38",
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
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
                    zIndex: 99,
                  }}
                />

              <div
                style={{
                  position: "absolute",
                  top: "49px",
                  right: 0,
                  width: "205px",
                  padding: "7px",
                  borderRadius: "13px",
                  border: "1px solid rgba(20,140,255,.65)",
                  background: "#071d38",
                  boxShadow: "0 12px 30px rgba(0,0,0,.45)",
                  zIndex: 100,
                }}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onCreateGroup();
                  }}
                  style={menuItemStyle}
                >
                  Crear grupo
                </button>

                {canAccessGroupAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAdmin();
                    }}
                    style={menuItemStyle}
                  >
                    Administración
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/registrar-actividad", { state: { user, returnSport: sport } });
                  }}
                  style={menuItemStyle}
                >
                  Registrar actividad
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = "/validar-actividad";
                  }}
                  style={menuItemStyle}
                >
                  Validar actividad
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/mi-perfil");
                  }}
                  style={menuItemStyle}
                >
                  Mi perfil
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = "/support";
                  }}
                  style={menuItemStyle}
                >
                  Soporte y privacidad
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  style={{
                    ...menuItemStyle,
                    color: "#ff8b8b",
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
              </>
            )}
          </div>
        </header>

        <div
          style={{
            display: "flex",
            gap: "7px",
            overflowX: "auto",
            padding: "3px 1px 10px",
            marginBottom: "5px",
            scrollbarWidth: "none",
          }}
        >
          {Object.entries(sportIcons).map(([sportCode, icon]) => (
            <button
              key={sportCode}
              onClick={() => onOpenSport(sportCode)}
              title={sportCode}
              style={{
                width: "42px",
                minWidth: "42px",
                height: "42px",
                borderRadius: "11px",
                border:
                  sportCode === sport
                    ? "2px solid #ff7900"
                    : "1px solid rgba(20,140,255,.55)",
                background:
                  sportCode === sport
                    ? "rgba(255,121,0,.15)"
                    : "#071d38",
                cursor: "pointer",
                fontSize: "21px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              {icon}
            </button>
          ))}
        </div>
        <section
          style={{
            position: "relative",
            height: "174px",
            overflow: "hidden",
            borderRadius: "18px 18px 0 0",
            border: "1px solid #148cff",
            borderBottom: 0,
          }}
        >
          <img
            src={sportImage}
            alt={sportName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(0deg, rgba(3,16,31,.96) 0%, rgba(3,16,31,.18) 68%)",
            }}
          />
        </section>

        <section
          style={{
            marginTop: "-1px",
            padding: "0 14px 14px",
            border: "1px solid #148cff",
            borderTop: 0,
            borderRadius: "0 0 18px 18px",
            background:
              "linear-gradient(180deg, rgba(5,29,52,.98), rgba(5,24,44,.98))",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              marginTop: "-41px",
              position: "relative",
              zIndex: 2,
              paddingBottom: "7px",
            }}
          >
            <span
              style={{
                fontSize: "45px",
                lineHeight: 1,
                filter: "saturate(1.4)",
              }}
            >
              {sportIcons[sport] || "●"}
            </span>

            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              {sportName}
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              borderBottom: "3px solid #ff7900",
              width: "fit-content",
              paddingBottom: "5px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "19px",
                fontWeight: 900,
              }}
            >
              Mi ranking
            </h2>

            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              style={{
                minWidth: "130px",
                background: "#08223d",
                color: "#fff",
                border: "1px solid #148cff",
                borderRadius: "16px",
                padding: "7px 10px",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              <option value="week">Semana en curso</option>
              <option value="month">Mes en curso</option>
              <option value="year">Año en curso</option>
              <option value="total">Total acumulado</option>
            </select>
          </div>

          <p
            style={{
              color: "#9db6ce",
              fontSize: "12px",
              margin: "6px 0 10px",
            }}
          >
            Tus posiciones y kilómetros en el período seleccionado.
          </p>

          {athlete ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                gap: "11px",
                background:
                  "linear-gradient(90deg, rgba(10,48,82,.96), rgba(7,39,69,.96))",
                border: "1px solid rgba(20,140,255,.45)",
                borderRadius: "14px",
                padding: "8px 11px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "48px",
                  height: "48px",
                  flex: "0 0 48px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#183d61",
                    border: "2px solid #148cff",
                    boxSizing: "border-box",
                  }}
                >
                  {athlete.profilePicture && (
                    <img
                      src={athlete.profilePicture}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>

                <span
                  style={{
                    position: "absolute",
                    right: "-1px",
                    bottom: "1px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#19df66",
                    border: "2px solid #092746",
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontWeight: 850,
                  fontSize: "15px",
                }}
              >
                {athlete.firstName} {athlete.lastName}
              </div>

              <strong
                style={{
                  color: "#25b7ff",
                  fontSize: "18px",
                  whiteSpace: "nowrap",
                }}
              >
                {athlete.distanceKm.toFixed(1)} km
              </strong>
            </div>
          ) : (
            <div
              style={{
                background: "#092b4b",
                borderRadius: "12px",
                padding: "13px",
                color: "#9db6ce",
                fontSize: "13px",
              }}
            >
              Todavía no tenés actividad validada en este deporte.
            </div>
          )}
        </section>

        <section style={{ marginBottom: "17px" }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "19px",
              borderBottom: "3px solid #ff7900",
              width: "fit-content",
              paddingBottom: "5px",
            }}
          >
            Mis grupos
          </h2>

          <div style={{ display: "grid", gap: "7px" }}>
            {groupsLoading ? (
              <div style={{ color: "#9db6ce", padding: "8px 2px" }}>
                Cargando grupos...
              </div>
            ) : myGroups.length === 0 ? (
              <div style={{ color: "#9db6ce", padding: "8px 2px" }}>
                Todavía no pertenecés a grupos de este deporte.
              </div>
            ) : (
              myGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onOpenGroup(group.id)}
                  style={row}
                >
                  <span
                    style={{
                      width: "11px",
                      height: "11px",
                      borderRadius: "50%",
                      background: group.upcomingEvent ? "#20df71" : "#ff8a00",
                      boxShadow: group.upcomingEvent ? "0 0 9px rgba(32,223,113,.75)" : "0 0 9px rgba(255,138,0,.75)",
                      flex: "0 0 11px",
                    }}
                  />

                  <span
  aria-hidden="true"
  style={{
    width: "18px",
    height: "18px",
    color: group.upcomingEvent ? "#20df71" : "#ff8a00",
    display: "inline-flex",
    flex: "0 0 18px",
  }}
>
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
</span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "14px",
                      }}
                    >
                      {group.name}
                    </strong>

                    <small style={{ color: group.visibility === "PUBLIC" ? "#20df71" : "#9db6ce" }}>
                      {group.visibility === "PUBLIC"
                        ? `Grupo público · Código: ${group.joinCode}`
                        : "Grupo privado"}
                    </small>

                    {group.upcomingEvent && (
                      <small style={{ display: "block", color: "#20df71", marginTop: "2px", fontWeight: 700 }}>
                        {new Date(group.upcomingEvent.eventDate).toLocaleDateString("es-AR")} · {group.upcomingEvent.departureTime}
                      </small>
                    )}
                  </span>
                  <span
                    style={{
                      minWidth: "58px",
                      height: "32px",
                      padding: "0 9px",
                      borderRadius: "10px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      background: "#06111d",
                      border: "2px solid #ff8a00",
                      color: "#fff",
                      fontWeight: 900,
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="#38bdf8"
                      style={{ display: "block", flexShrink: 0 }}
                    >
                      <circle cx="12" cy="7" r="3" />
                      <circle cx="5.5" cy="9" r="2.4" />
                      <circle cx="18.5" cy="9" r="2.4" />
                      <path d="M7 18c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5v1H7v-1Z" />
                      <path d="M1.5 18c0-2.7 1.7-4.6 4-4.6 1 0 1.9.4 2.6 1-1.1 1.2-1.7 2.8-1.7 4.6H1.5v-1Z" />
                      <path d="M22.5 18c0-2.7-1.7-4.6-4-4.6-1 0-1.9.4-2.6 1 1.1 1.2 1.7 2.8 1.7 4.6h4.9v-1Z" />
                    </svg>
                    <span>{group._count?.members ?? 0}</span>
                  </span>

                  <strong style={{ fontSize: "22px" }}>›</strong>
                </button>
              ))
            )}
          </div>
        </section>

        <section style={{ marginBottom: "17px" }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "19px",
              borderBottom: "3px solid #ff7900",
              width: "fit-content",
              paddingBottom: "5px",
            }}
          >
            Unirme a un grupo
          </h2>

          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "9px",
              background: "#082846",
              border: "1px solid rgba(20,140,255,.48)",
              borderRadius: "12px",
            }}
          >
            <input
              value={joinCode}
              onChange={(e) => onJoinCodeChange(e.target.value)}
              placeholder="Código del grupo"
              style={{
                flex: 1,
                minWidth: 0,
                background: "#061b31",
                color: "#fff",
                border: "1px solid #148cff",
                borderRadius: "9px",
                padding: "11px 12px",
                outline: "none",
              }}
            />

            <button
              onClick={onJoin}
              style={{
                border: 0,
                borderRadius: "9px",
                padding: "0 20px",
                background: "#168cff",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Unirme
            </button>
          </div>

          <p
            style={{
              color: "#7f9bb5",
              fontSize: "11px",
              margin: "5px 2px 0",
            }}
          >
            Ingresá el código que te compartió el administrador del grupo.
          </p>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "19px",
              borderBottom: "3px solid #ff7900",
              width: "fit-content",
              paddingBottom: "5px",
            }}
          >
            Grupos públicos
          </h2>

          <div style={{ display: "grid", gap: "7px" }}>
            {publicGroups.length === 0 ? (
              <div style={{ color: "#9db6ce", padding: "8px 2px" }}>
                No hay otros grupos públicos en este deporte.
              </div>
            ) : (
              publicGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onOpenGroup(group.id)}
                  style={row}
                >
                  <span
                    style={{
                      width: "11px",
                      height: "11px",
                      borderRadius: "50%",
                      background: group.upcomingEvent ? "#20df71" : "#ff8a00",
                      boxShadow: group.upcomingEvent ? "0 0 9px rgba(32,223,113,.75)" : "0 0 9px rgba(255,138,0,.75)",
                      flex: "0 0 11px",
                    }}
                  />

                  <span
  aria-hidden="true"
  style={{
    width: "18px",
    height: "18px",
    color: group.upcomingEvent ? "#20df71" : "#ff8a00",
    display: "inline-flex",
    flex: "0 0 18px",
  }}
>
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
</span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "14px",
                      }}
                    >
                      {group.name}
                    </strong>

                    <small style={{ color: "#9db6ce" }}>
                      {group._count?.members ?? 0} atletas
                    </small>

                    {group.upcomingEvent && (
                      <small style={{ display: "block", color: "#20df71", marginTop: "2px", fontWeight: 700 }}>
                        {new Date(group.upcomingEvent.eventDate).toLocaleDateString("es-AR")} · {group.upcomingEvent.departureTime}
                      </small>
                    )}
                  </span>

                  <strong style={{ fontSize: "22px" }}>›</strong>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
