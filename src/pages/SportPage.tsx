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
  upcomingEventsCount?: number;
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
            marginTop: "-48px",
            padding: "0 14px 14px",
            border: "1px solid #148cff",
            borderTop: 0,
            borderRadius: "0 0 18px 18px",
            background:
              "linear-gradient(180deg, rgba(5,29,52,0) 0px, rgba(5,29,52,.40) 42px, rgba(5,24,44,.98) 100px)",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              marginTop: "4px",
              position: "relative",
              zIndex: 2,
              paddingBottom: "0px",
              transform: "translateY(-13px)",
            }}
          >
            <span className="viarank-sport-icon" style={{ fontSize: "45px",
                lineHeight: 1,
                filter: "saturate(1.4)",
              }}
            >
              {sportIcons[sport] || "●"}
            </span>

            <h1 className="viarank-sport-title" style={{ margin: 0, fontSize: "32px", position: "relative", top: "-65px", left: "-45px",
                lineHeight: 1,
                fontWeight: 900, transform: "translate(-15px, -50px)",
              }}
            >
              {sportName}
            </h1>
          </div>

                    <style>{`
            @keyframes vrRegistrarBrillo {
              0%, 65% {
                transform: translateX(-170%) skewX(-22deg);
              }
              100% {
                transform: translateX(230%) skewX(-22deg);
              }
            }

            .vr-boton-registrar-destello {
              isolation: isolate;
              transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
              outline-offset: 3px;
              filter: saturate(1.15);
            }

            .vr-boton-registrar-destello:hover {
              filter: brightness(1.13) saturate(1.25);
            }

            .vr-boton-registrar-destello:active {
              transform: translateY(4px);
              box-shadow:
                inset 0 4px 9px rgba(0,45,20,.7),
                inset 0 1px 2px rgba(255,255,255,.45),
                0 2px 0 #00472c,
                0 3px 7px rgba(0,0,0,.3) !important;
            }

            .vr-boton-registrar-destello:focus-visible {
              outline: 3px solid #b4ff7b;
            }

            .vr-boton-registrar-brillo {
              position: absolute;
              inset: 0;
              z-index: 0;
              background: linear-gradient(
                105deg,
                transparent 30%,
                rgba(255,255,255,.05) 41%,
                rgba(235,255,210,.95) 49%,
                rgba(255,255,255,.24) 55%,
                transparent 68%
              );
              animation: vrRegistrarBrillo 3.6s ease-in-out infinite;
              pointer-events: none;
            }

            @media (prefers-reduced-motion: reduce) {
              .vr-boton-registrar-brillo {
                animation: none;
              }
            }
          
            @keyframes vrDestellosVerdes2026 {
              0%, 14%, 27%, 49%, 73%, 100% {
                opacity: .08;
              }
              7%, 21%, 43%, 66% {
                opacity: 1;
              }
            }

            .vr-boton-registrar-destello .vr-boton-registrar-brillo {
              position: absolute !important;
              inset: 0 !important;
              transform: none !important;
              background:
                radial-gradient(circle at 20% 20%, rgba(255,255,255,.95) 0px, rgba(190,255,210,.5) 2px, transparent 8px),
                radial-gradient(circle at 80% 38%, rgba(255,255,255,.95) 0px, rgba(170,255,205,.45) 2px, transparent 9px),
                radial-gradient(circle at 40% 82%, rgba(255,255,255,.85) 0px, rgba(170,255,205,.4) 2px, transparent 7px) !important;
              animation: vrDestellosVerdes2026 4s ease-in-out infinite !important;
              pointer-events: none;
            }

            @media (prefers-reduced-motion: reduce) {
              .vr-boton-registrar-destello .vr-boton-registrar-brillo {
                animation: none !important;
                opacity: .2;
              }
            }
`}</style>
<div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "12px",
              borderBottom: "3px solid #ff7900",
              width: "100%",
              paddingBottom: "5px",
            }}
          >
            <h2 className="viarank-ranking-title" style={{ margin: 0, transform: "translateY(-4px)", fontSize: "19px",
                fontWeight: 900,
              }}
            >
              Mi ranking
            </h2>

            
            <button
              type="button"
              className="vr-boton-registrar-destello"
              onClick={() => navigate("/registrar-actividad", {
                state: { user, returnSport: sport }
              })}
              style={{
                position: "relative",
                flex: "0 0 175px",
                minWidth: "175px",
                maxWidth: "175px",
                height: "44px",
                marginLeft: "auto",
                 transform: "translateY(-3px)",
                padding: "4px",
                overflow: "hidden",
                border: 0,
                borderRadius: "13px",
                background: "linear-gradient(155deg,#75f6a0 0%,#12bb63 18%,#078448 43%,#03482c 78%,#011e16 100%)",
                boxShadow: "inset 0 3px 3px rgba(235,255,235,.9), inset 0 -11px 13px rgba(0,18,12,.9), 0 6px 0 #012c1c, 0 0 15px rgba(40,255,125,.55), 0 10px 22px rgba(0,0,0,.5)",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              <span className="vr-boton-registrar-brillo" aria-hidden="true" />
              <span style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                height: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                border: "1.5px solid #c3ffd0",
                borderRadius: "9px",
                textAlign: "center"
              }}>
                <span style={{
                  fontSize: "21px",
                  lineHeight: 1,
                  fontWeight: 900
                }}>
                  <style>{`
  .vr-icono-registro-alternado {
    display: inline-grid;
    place-items: center;
    width: 23px;
    height: 23px;
    flex-shrink: 0;
  }

  .vr-icono-registro-alternado > span {
    grid-area: 1 / 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 23px;
    height: 23px;
  }

  .vr-icono-registro-ubicacion {
    animation: vr-ubicacion-visible 2s steps(1,end) infinite;
  }

  .vr-icono-registro-deporte {
    font-size: 23px;
    line-height: 1;
    animation: vr-deporte-visible 2s steps(1,end) infinite;
  }

  @keyframes vr-ubicacion-visible {
    0%, 49.999% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  @keyframes vr-deporte-visible {
    0%, 49.999% { opacity: 0; }
    50%, 100% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .vr-icono-registro-ubicacion { animation: none; opacity: 1; }
    .vr-icono-registro-deporte { animation: none; opacity: 0; }
  }
`}</style>
<span className="vr-icono-registro-alternado" aria-hidden="true">
  <span className="vr-icono-registro-ubicacion">
<svg
                    width="27"
                    height="27"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,.4))" }}
                  >
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.6" />
                  </svg>  </span>
  <span className="vr-icono-registro-deporte">
    {sportIcons[sport] || "🚴"}
  </span>
</span>
                </span>
                <span style={{
                  fontSize: "8px",
                   whiteSpace: "nowrap",
                  fontWeight: 900,
                  lineHeight: 1.25
                }}>
                  REGISTRAR ACTIVIDAD
                </span>
              </span>
            </button>
          </div>
          {/* viarank-periodo-debajo */}
          <div style={{
            display: "flex",
            justifyContent: "flex-start",
            marginTop: "8px",
            marginBottom: "6px"
          }}>
<div style={{ position: "relative", width: "100%", height: "32px" }}>
  <div
    aria-hidden="true"
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "flex-start",
      gap: "0px",
      padding: "3px 32px 0 12px",
      background: "#08223d",
      border: "1px solid #148cff",
      borderRadius: "16px",
      color: "#fff",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}
  >
    <span style={{ fontSize: "12px", fontWeight: 800, flexShrink: 0, position: "absolute", top: "1px", left: "12px" }}>
      {period === "week" ? "Semana en curso" :
       period === "month" ? "Mes en curso" :
       period === "year" ? "Año en curso" : "Total acumulado"}
    </span>
    <span style={{ position: "absolute", right: "12px", top: "7px", fontSize: "13px" }}>
      ▾
    </span>
  </div>
  <select
    className="viarank-ranking-period"
    aria-label="Seleccionar período del ranking"
    value={period}
    onChange={(e) => onPeriodChange(e.target.value)}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "32px",
      minWidth: 0,
      margin: 0,
      opacity: 0,
      cursor: "pointer",
    }}
  >
    <option value="week" style={{ color: "#111111", backgroundColor: "#ffffff" }}>Semana en curso</option>
    <option value="month" style={{ color: "#111111", backgroundColor: "#ffffff" }}>Mes en curso</option>
    <option value="year" style={{ color: "#111111", backgroundColor: "#ffffff" }}>Año en curso</option>
    <option value="total" style={{ color: "#111111", backgroundColor: "#ffffff" }}>Total acumulado</option>
  </select>
</div>

          </div>

          

          {athlete ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "48px",
                gap: "3px",
                background:
                  "linear-gradient(90deg, rgba(10,48,82,.96), rgba(7,39,69,.96))",
                border: "1px solid rgba(20,140,255,.45)",
                borderRadius: "14px",
                padding: "4px 11px 3px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "38px",
                  height: "38px",
                  flex: "0 0 38px",
                }}
              >
                <div
                  style={{
                    width: "34px", height: "34px", borderRadius: "50%",
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

        <section style={{ marginTop: "-7px", marginBottom: "12px" }}>
          <h2
            style={{
              margin: "0 0 -2px",
              fontSize: "13px",
              borderBottom: "none",
              width: "fit-content",
              paddingBottom: "3px",
            }}
          >
            Unirme a un grupo
            <span
              title="Cómo unirme a un grupo"
              style={{
                position: "relative",
                display: "inline-block",
                marginLeft: "5px",
                color: "#ff9b20",
                fontWeight: 900,
                verticalAlign: "middle",
              }}
            >
              <details style={{ display: "inline-block" }}>
                <summary
                  aria-label="Ayuda para unirme a un grupo"
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    fontSize: "19px",
                    display: "inline-block",
                  }}
                >
                  ?
                </summary>
                <div
                  style={{
                    position: "absolute",
                    top: "27px",
                    left: "-145px",
                    width: "min(300px, 78vw)",
                    zIndex: 30,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #148cff",
                    background: "#092b49",
                    boxShadow: "0 8px 22px rgba(0,0,0,.45)",
                    color: "#ffffff",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    fontWeight: 400,
                  }}
                >
                  <strong>¿Cómo me uno a un grupo?</strong>
                  <div style={{ marginTop: "5px" }}>
                    Pedile al administrador del grupo que te comparta
                    el código. Después ingresalo en el campo y
                    presioná Unirme.
                  </div>
                </div>
              </details>
            </span>
          </h2>

          <div
            style={{
              display: "flex",
              gap: "5px",
              padding: "2px",
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
                padding: "2px 9px",
                outline: "none",
              }}
            />

            <button
              onClick={onJoin}
              style={{
                border: "1px solid #8affb5",
                borderRadius: "10px",
                padding: "0 12px",
                height: "29px", minHeight: "29px",
                background: "linear-gradient(180deg, #75ffb2 0%, #1bdc76 18%, #07964e 58%, #03532e 100%)",
                boxShadow: "0 4px 0 #003e23, 0 6px 12px rgba(0,0,0,.28), inset 0 2px 1px rgba(255,255,255,.6)",
                color: "#ffffff",
                fontWeight: 900,
                fontSize: "13px",
                textShadow: "0 1px 2px rgba(0,0,0,.4)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              Unirme
            </button>
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
            Mis grupos
          </h2>

          <div style={{ display: "grid", gap: "7px" }}>
            <style>{`
              @keyframes vr-parpadeo-eventos {
                0%, 49.99% { opacity: 1; }
                50%, 99.99% { opacity: 0; }
              }
            `}</style>
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
                  style={{ ...row, paddingTop: "1px", paddingBottom: "1px" }}
                >
                  <span
  aria-hidden="true"
  style={{
    position: "relative",
    width: "46px",
    height: "49px",
    flex: "0 0 46px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9px",
    background: "linear-gradient(145deg, #104e80, #061b36)",
    border: "1px solid #148cff",
    boxSizing: "border-box",
    overflow: "visible",
    transform: "translate(-3px, 0px)",
    boxShadow: "inset 0 1px 3px rgba(100,210,255,.35)",
  }}
>
  <svg
    viewBox="0 0 48 48"
    width="43"
    height="43"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="5" y="9" width="38" height="34" rx="5"
      fill="#d9efff" stroke="#20c5ff" strokeWidth="2" />
    <path d="M5 14 Q5 9 10 9 H38 Q43 9 43 14 V19 H5 Z"
      fill="#078de8" />
    <path d="M15 5 V13 M33 5 V13"
      stroke="#d9f6ff" strokeWidth="4" strokeLinecap="round" />
    <g fill="#7eaed6">
      <rect x="11" y="23" width="7" height="6" rx="1" />
      <rect x="21" y="23" width="7" height="6" rx="1" />
      <rect x="31" y="23" width="7" height="6" rx="1" />
      <rect x="11" y="32" width="7" height="6" rx="1" />
      <rect x="21" y="32" width="7" height="6" rx="1" />
    </g>
    <rect x="31" y="32" width="7" height="6" rx="1"
      fill="#ff8a00" />
  </svg>

  <span
    style={{
      position: "absolute",
      left: "-7px",
      bottom: "-7px",
      width: "21px",
      height: "21px",
      borderRadius: "50%",
      background: "#f02e39",
      border: "2px solid #082846",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: 900,
      boxSizing: "border-box",
      boxShadow: "0 2px 6px rgba(0,0,0,.45)",
      animation: (group.upcomingEventsCount ?? 0) > 0
        ? "vr-parpadeo-eventos 2s steps(1, end) infinite"
        : "none",
    }}
  >
    {group.upcomingEventsCount ?? 0}
  </span>
</span>
<span style={{ flex: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "14px",
                      }}
                    >
                      {group.name ? group.name.charAt(0).toLocaleUpperCase("es-AR") + group.name.slice(1) : ""}
                    </strong>

                    <small style={{ color: group.visibility === "PUBLIC" ? "#20df71" : "#9db6ce" }}>
                      {group.visibility === "PUBLIC"
                        ? `Grupo público · Código: ${group.joinCode}`
                        : "Grupo privado"}
                    </small>
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

        
      </main>
    </div>
  );
}




