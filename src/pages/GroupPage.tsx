import sportCiclismo from "../assets/sports/sport-ciclismo.png";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";
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

type Group = {
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

type GroupEvent = {
  id: string;
  groupId: string;
  title: string;
  eventDate: string;
  departureTime: string;
  meetingPlace: string;
  destination?: string | null;
  estimatedReturn?: string | null;
  plannedSpeed?: string | null;
  rules?: string | null;
};
type Props = {
  group: Group;
  ranking: RankingAthlete[];
  loading: boolean;
  period: string;
  sexFilter: string;
  profilePicture?: string | null;
  activityHistory: ActivityHistoryItem[];
  activityHistoryLoading: boolean;
  activityHistoryAthlete: RankingAthlete | null;
  onPeriodChange: (period: string) => void;
  onSexFilterChange: (sex: string) => void;
  onBack: () => void;
  onOpenAthlete: (athlete: RankingAthlete) => void;
  onCreateEvent: (
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
  ) => Promise<unknown>;
};

import { useEffect, useState } from "react";

export default function GroupPage({
  group,
  ranking,
  loading,
  period,
  sexFilter,
  profilePicture,
  activityHistory,
  activityHistoryLoading,
  activityHistoryAthlete,
  onPeriodChange,
  onSexFilterChange,
  onBack,
  onOpenAthlete,
  onCreateEvent,
}: Props) {
  const [activeTab, setActiveTab] = useState<"ranking" | "events">("ranking");
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [destination, setDestination] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [plannedSpeed, setPlannedSpeed] = useState("");
  const [eventRules, setEventRules] = useState("");

  async function loadEvents() {
    try {
      setEventsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/${group.id}/events`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los eventos");
      }

      setEvents(data.events || []);
    } catch (error) {
      setEventMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los eventos."
      );
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [group.id]);
  const upcomingEvent = events.find((event) => {
    const eventDay = new Date(`${event.eventDate.slice(0, 10)}T23:59:59`);
    return eventDay >= new Date();
  });
  const periodLabel =
    period === "week"
      ? "Semana"
      : period === "month"
        ? "Mes"
        : period === "year"
          ? "Año"
          : "Total";

  const eventInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: "9px",
    border: "1px solid #285b82",
    background: "#081f36",
    color: "#fff",
    fontSize: "13px",
    outline: "none",
  };
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 0%, #123d68 0%, #071b31 38%, #03101f 100%)",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  };

  const card: React.CSSProperties = {
    background: "linear-gradient(145deg, #102e4d, #09233e)",
    border: "1px solid #1b527e",
    borderRadius: "15px",
    boxShadow: "0 8px 20px rgba(0,0,0,.22)",
  };

  return (
    <div style={shell}>
      <div
        style={{
          width: "min(100%, 515px)",
          minHeight: "100vh",
          margin: "0 auto",
          padding: "18px 14px 90px",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "42px 1fr 42px",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <button
            onClick={onBack}
            aria-label="Volver"
            style={{
              border: 0,
              background: "transparent",
              color: "#fff",
              fontSize: "31px",
              cursor: "pointer",
            }}
          >
            ‹
          </button>

          <img
            src={viarankHeaderLogo}
            alt="ViaRank"
            style={{
              width: "120px",
              height: "38px",
              objectFit: "contain",
              display: "block",
              justifySelf: "center",
            }}
          />

          <div
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              justifySelf: "end",
            }}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt=""
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #188cff",
                }}
              />
            ) : (
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "#173d61",
                  border: "2px solid #188cff",
                }}
              />
            )}
            <span
              style={{
                position: "absolute",
                right: "-1px",
                bottom: "1px",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "#19df66",
                border: "2px solid #071b31",
              }}
            />
          </div>
        </header>

        <section
          style={{
            ...card,
            padding: 0,
            overflow: "hidden",
            marginBottom: "12px",
            border: "1px solid #168cff",
          }}
        >
          <div
            style={{
              position: "relative",
              height: "145px",
              backgroundImage: `linear-gradient(to top, rgba(3,16,31,.96) 0%, rgba(3,16,31,.25) 70%), url(${sportCiclismo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "17px",
                right: "17px",
                bottom: "14px",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "29px",
                  lineHeight: 1,
                  fontWeight: 900,
                  textShadow: "0 2px 8px rgba(0,0,0,.9)",
                }}
              >
                {group.name}
              </h1>

              <div
                style={{
                  marginTop: "7px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#d9e8f5",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span style={{ color: "#19df66" }}>▣</span>
                {group.visibility === "PUBLIC"
                  ? "Grupo público"
                  : "Grupo privado"}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "13px 15px 15px",
              display: "grid",
              gridTemplateColumns: "1.25fr .75fr 1.25fr",
              gap: "9px",
              alignItems: "center",
              background: "linear-gradient(145deg, #103353, #09233e)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#8eabc3",
                  fontSize: "10px",
                  marginBottom: "4px",
                }}
              >
                Administrador
              </div>
              <strong
                style={{
                  display: "block",
                  fontSize: "12px",
                  lineHeight: 1.3,
                }}
              >
                <span style={{ display: "block" }}>
                  {group.administrator.firstName}
                </span>
                <span style={{ display: "block" }}>
                  {group.administrator.lastName}
                </span>
              </strong>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "2px",
                }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="#38bdf8"
                  style={{ display: "block" }}
                >
                  <circle cx="12" cy="7" r="3" />
                  <circle cx="5.5" cy="9" r="2.4" />
                  <circle cx="18.5" cy="9" r="2.4" />
                  <path d="M7 18c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5v1H7v-1Z" />
                  <path d="M1.5 18c0-2.7 1.7-4.6 4-4.6 1 0 1.9.4 2.6 1-1.1 1.2-1.7 2.8-1.7 4.6H1.5v-1Z" />
                  <path d="M22.5 18c0-2.7-1.7-4.6-4-4.6-1 0-1.9.4-2.6 1 1.1 1.2 1.7 2.8 1.7 4.6h4.9v-1Z" />
                </svg>
              </div>
              <strong style={{ fontSize: "12px" }}>
                {group.members}
              </strong>
              <div style={{ color: "#8eabc3", fontSize: "9px" }}>
                atletas
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: upcomingEvent ? "#27d17f" : "#ff8a00",
                      boxShadow: upcomingEvent
                        ? "0 0 7px rgba(39,209,127,.7)"
                        : "0 0 7px rgba(255,138,0,.7)",
                    }}
                  />

                  <span
                    aria-hidden="true"
                    style={{
                      width: "17px",
                      height: "17px",
                      color: upcomingEvent ? "#27d17f" : "#ff8a00",
                      display: "inline-flex",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 10h18" />
                    </svg>
                  </span>
                </div>

                <strong
                  style={{
                    display: "block",
                    color: upcomingEvent ? "#27d17f" : "#ff9a22",
                    fontSize: "11px",
                  }}
                >
                  {upcomingEvent
                    ? `${new Date(upcomingEvent.eventDate).toLocaleDateString(
                        "es-AR"
                      )} · ${upcomingEvent.departureTime}`
                    : "Sin evento próximo"}
                </strong>
            </div>
          </div>
        </section>

        <nav
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid #234865",
            marginBottom: "17px",
          }}
        >
          <button onClick={() => setActiveTab("ranking")}
            style={{
              padding: "12px",
              border: 0,
              borderBottom: activeTab === "ranking" ? "3px solid #ff8a00" : "3px solid transparent",
              background: "transparent",
              color: activeTab === "ranking" ? "#fff" : "#7894ad",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Ranking
          </button>
          <button onClick={() => setActiveTab("events")}
            style={{
              padding: "12px",
              border: 0,
              borderBottom: activeTab === "events" ? "3px solid #ff8a00" : "3px solid transparent",
              color: activeTab === "events" ? "#fff" : "#7894ad",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Eventos
          </button>
        </nav>

        {activeTab === "ranking" ? (
          <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px" }}>Ranking</h2>

            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              style={{
                background: "#102f4e",
                color: "#fff",
                border: "1px solid #2870a7",
                borderRadius: "9px",
                padding: "7px 9px",
                fontWeight: 800,
              }}
            >
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
              <option value="total">Total</option>
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "7px",
              marginBottom: "13px",
            }}
          >
            {[
              ["", "General"],
              ["FEMALE", "Femenino"],
              ["MALE", "Masculino"],
            ].map(([value, label]) => (
              <button
                key={label}
                onClick={() => onSexFilterChange(value)}
                style={{
                  padding: "8px 5px",
                  borderRadius: "9px",
                  border:
                    sexFilter === value
                      ? "1px solid #ff8a00"
                      : "1px solid #285473",
                  background:
                    sexFilter === value ? "#123b5d" : "#0c2945",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ color: "#9db6ce", fontSize: "12px", marginBottom: "9px" }}>
            {periodLabel}
          </div>

          {loading ? (
            <div style={{ ...card, padding: "18px" }}>Cargando ranking...</div>
          ) : ranking.length === 0 ? (
            <div style={{ ...card, padding: "18px", color: "#9db6ce" }}>
              Todavía no hay actividades para este período.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {ranking.map((athlete) => {
                const isOpen =
                  activityHistoryAthlete?.userId === athlete.userId;

                return (
                  <div
                    key={athlete.userId}
                    style={{
                      ...card,
                      border: "1px solid #1c527c",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => onOpenAthlete(athlete)}
                      style={{
                        width: "100%",
                        border: 0,
                        background: "transparent",
                        padding: "10px 11px",
                        display: "grid",
                        gridTemplateColumns: "30px 42px 1fr auto 18px",
                        gap: "8px",
                        alignItems: "center",
                        color: "#fff",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ textAlign: "center", fontSize: "16px" }}>
                        {athlete.position}
                      </strong>

                      {athlete.profilePicture ? (
                        <img
                          src={athlete.profilePicture}
                          alt=""
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #2878b7",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "#173d61",
                            border: "2px solid #2878b7",
                          }}
                        />
                      )}

                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: "13px" }}>
                          {athlete.firstName} {athlete.lastName}
                        </strong>

                        {athlete.hasOverlap && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              marginLeft: "7px",
                            }}
                          >
                            <span
                              title="Posible superposición de actividades"
                              style={{
                                display: "inline-block",
                                width: "15px",
                                height: "9px",
                                borderRadius: "2px",
                                background: "#ffff00",
                                border: "1px solid #e1c900",
                              }}
                            />
                            <strong
                              style={{
                                color: "#ff3434",
                                fontSize: "10px",
                                animation: "viarankVarBlink 1s infinite",
                              }}
                            >
                              VAR
                            </strong>
                          </span>
                        )}
                      </div>

                      <strong
                        style={{
                          color: "#fff",
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {athlete.distanceKm.toFixed(1)} km
                      </strong>

                      <strong style={{ fontSize: "20px" }}>
                        {isOpen ? "⌄" : "›"}
                      </strong>
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          borderTop: "1px solid #1c527c",
                          padding: "4px 12px 10px",
                          background: "#081f38",
                        }}
                      >
                        {activityHistoryLoading ? (
                          <div
                            style={{
                              padding: "12px 0",
                              color: "#9db6ce",
                              fontSize: "12px",
                            }}
                          >
                            Cargando historial...
                          </div>
                        ) : activityHistory.length === 0 ? (
                          <div
                            style={{
                              padding: "12px 0",
                              color: "#9db6ce",
                              fontSize: "12px",
                            }}
                          >
                            No hay actividades registradas.
                          </div>
                        ) : (
                          activityHistory.map((activity) => (
                            <div
                              key={activity.id}
                              style={{
                                padding: "10px 0",
                                borderBottom:
                                  "1px solid rgba(56, 189, 248, 0.16)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "7px",
                                }}
                              >
                                <strong
                                  style={{
                                    color: "#fff",
                                    fontSize: "13px",
                                  }}
                                >
                                  {activity.name}
                                </strong>

                                {activity.hasOverlap && (
                                  <span
                                    title="Actividad con posible superposición"
                                    style={{
                                      display: "inline-block",
                                      width: "15px",
                                      height: "9px",
                                      borderRadius: "2px",
                                      background: "#ffff00",
                                      border: "1px solid #e1c900",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop: "4px",
                                  color: "#9db6ce",
                                  fontSize: "12px",
                                }}
                              >
                                {new Date(activity.startDate).toLocaleString(
                                  "es-AR"
                                )}
                                {" · "}
                                {activity.distanceKm.toLocaleString("es-AR")} km
                                {" · "}
                                {activity.source}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        ) : (
          <section>
            <div style={{ marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>Eventos</h2>
              <div style={{ color: "#9db6ce", fontSize: "12px", marginTop: "5px" }}>
                Próximas salidas organizadas por el grupo.
              </div>
            </div>

            {eventsLoading ? (
              <div
                style={{
                  ...card,
                  padding: "18px",
                  textAlign: "center",
                  marginBottom: "12px",
                  color: "#9db6ce",
                }}
              >
                Cargando eventos...
              </div>
            ) : events.length === 0 ? (
              <div
                style={{
                  ...card,
                  padding: "18px",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                <div style={{ color: "#ff8a00", fontSize: "26px", marginBottom: "8px" }}>
                  ●  ▣
                </div>
                <strong style={{ display: "block", fontSize: "15px" }}>
                  No hay próximos eventos
                </strong>
                <div style={{ color: "#8faac1", fontSize: "12px", marginTop: "5px" }}>
                  Cuando se programe una salida aparecerá aquí.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      ...card,
                      padding: "15px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <span style={{ color: "#27d17f", fontSize: "18px" }}>●</span>
                      <strong style={{ fontSize: "16px" }}>{event.title}</strong>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "6px",
                        color: "#b9d0e3",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        Fecha: {new Date(event.eventDate).toLocaleDateString("es-AR")}
                        {" · "}
                        Salida: {event.departureTime}
                      </div>

                      <div>Encuentro: {event.meetingPlace}</div>

                      {event.destination && (
                        <div>Destino: {event.destination}</div>
                      )}

                      {event.estimatedReturn && (
                        <div>Regreso estimado: {event.estimatedReturn}</div>
                      )}

                      {event.plannedSpeed && (
                        <div>Velocidad prevista: {event.plannedSpeed}</div>
                      )}

                      {event.rules && (
                        <div style={{ marginTop: "4px", color: "#8faac1" }}>
                          {event.rules}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showEventForm ? (
              <button
                onClick={() => setShowEventForm(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "11px",
                  border: "1px solid #2584c5",
                  background: "#0f4774",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                + Crear evento
              </button>
            ) : (
              <div style={{ ...card, padding: "16px" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "17px" }}>
                  Crear evento
                </h3>

                <div style={{ display: "grid", gap: "11px" }}>
                  <input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Título de la salida"
                    style={eventInputStyle}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "9px",
                    }}
                  >
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      style={eventInputStyle}
                    />

                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      style={eventInputStyle}
                    />
                  </div>

                  <input
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                    placeholder="Lugar de encuentro"
                    style={eventInputStyle}
                  />

                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Destino"
                    style={eventInputStyle}
                  />

                  <div>
                    <div
                      style={{
                        color: "#8faac1",
                        fontSize: "11px",
                        marginBottom: "5px",
                      }}
                    >
                      Regreso estimado
                    </div>

                    <input
                      type="time"
                      value={estimatedReturn}
                      onChange={(e) => setEstimatedReturn(e.target.value)}
                      style={eventInputStyle}
                    />
                  </div>

                  <input
                    value={plannedSpeed}
                    onChange={(e) => setPlannedSpeed(e.target.value)}
                    placeholder="Velocidad prevista"
                    style={eventInputStyle}
                  />

                  <textarea
                    value={eventRules}
                    onChange={(e) => setEventRules(e.target.value)}
                    placeholder="Reglas / observaciones"
                    rows={4}
                    style={{
                      ...eventInputStyle,
                      resize: "vertical",
                    }}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "9px",
                    }}
                  >
                    <button
                      onClick={() => setShowEventForm(false)}
                      style={{
                        padding: "11px",
                        borderRadius: "10px",
                        border: "1px solid #315a79",
                        background: "#0b2944",
                        color: "#a9bfd2",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      disabled={savingEvent}
                      onClick={async () => {
                        if (
                          !eventTitle ||
                          !eventDate ||
                          !departureTime ||
                          !meetingPlace
                        ) {
                          setEventMessage(
                            "Completá título, fecha, hora y lugar de encuentro."
                          );
                          return;
                        }

                        try {
                          setSavingEvent(true);
                          setEventMessage("");

                          const createdEvent = await onCreateEvent(group.id, {
                            title: eventTitle,
                            eventDate,
                            departureTime,
                            meetingPlace,
                            destination,
                            estimatedReturn,
                            plannedSpeed,
                            rules: eventRules,
                          });

                          if (createdEvent) {
                            setEvents((currentEvents) => [
                              ...currentEvents,
                              createdEvent as GroupEvent,
                            ]);
                          }

                          setEventMessage("Evento guardado correctamente.");
                          setShowEventForm(false);

                          setEventTitle("");
                          setEventDate("");
                          setDepartureTime("");
                          setMeetingPlace("");
                          setDestination("");
                          setEstimatedReturn("");
                          setPlannedSpeed("");
                          setEventRules("");
                        } catch (error) {
                          setEventMessage(
                            error instanceof Error
                              ? error.message
                              : "No se pudo guardar el evento."
                          );
                        } finally {
                          setSavingEvent(false);
                        }
                      }}
                      style={{
                        padding: "11px",
                        borderRadius: "10px",
                        border: "1px solid #2584c5",
                        background: "#0f4774",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: savingEvent ? "default" : "pointer",
                        opacity: savingEvent ? 0.6 : 1,
                      }}
                    >
                      {savingEvent ? "Guardando..." : "Guardar evento"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {eventMessage && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "9px",
                  background: "#0b2944",
                  border: "1px solid #2584c5",
                  color: "#b9d9f2",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                {eventMessage}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
