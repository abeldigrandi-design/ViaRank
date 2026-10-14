import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";

const API_URL = import.meta.env.VITE_API_URL;

type TravelActivity = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  dayNumber?: number | null;
  type?: string | null;
  distanceKm?: number | null;
};

type TravelTripContent = {
  id: string;
  companyId: string;
  title: string;
  destination: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "FINISHED" | "CANCELLED";
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
  nights?: number | null;
  totalDistanceKm?: number | null;
  elevationGain?: number | null;
  difficulty?: string | null;
  price?: number | null;
  totalCapacity?: number | null;
  externalReservedPlaces?: number | null;
  modules?: unknown[];
  activities?: TravelActivity[];
  accommodations?: unknown[];
  meals?: unknown[];
  transport?: unknown | null;
  transfers?: unknown[];
  insurance?: unknown | null;
  equipment?: unknown[];
  pricing?: unknown | null;
};

type ContentResponse = {
  success: boolean;
  trip: TravelTripContent;
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(20,140,255,.34)",
  borderRadius: "15px",
  background: "rgba(8,35,62,.78)",
  padding: "15px",
};

function statusLabel(status: TravelTripContent["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "PUBLICADO";
    case "FINISHED":
      return "FINALIZADO";
    case "CANCELLED":
      return "CANCELADO";
    default:
      return "BORRADOR";
  }
}

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("es-AR");
}

export default function TravelTripPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId = "", tripId = "" } = useParams();
  const isGeneralPage = location.pathname.endsWith("/informacion-general");

  const [trip, setTrip] = useState<TravelTripContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState("");
  const [general, setGeneral] = useState({
    title: "", destination: "", description: "", startDate: "", endDate: "",
    days: "", nights: "", totalDistanceKm: "", elevationGain: "",
    difficulty: "", totalCapacity: "", externalReservedPlaces: "0",
  });

  function openGeneral() {
    if (!trip) return;
    setGeneral({
      title: trip.title,
      destination: trip.destination,
      description: trip.description ?? "",
      startDate: trip.startDate?.slice(0, 10) ?? "",
      endDate: trip.endDate?.slice(0, 10) ?? "",
      days: trip.days == null ? "" : String(trip.days),
      nights: trip.nights == null ? "" : String(trip.nights),
      totalDistanceKm: trip.totalDistanceKm == null ? "" : String(trip.totalDistanceKm),
      elevationGain: trip.elevationGain == null ? "" : String(trip.elevationGain),
      difficulty: trip.difficulty ?? "",
      totalCapacity: trip.totalCapacity == null ? "" : String(trip.totalCapacity),
      externalReservedPlaces: String(trip.externalReservedPlaces ?? 0),
    });
    setGeneralMessage("");
    setEditingGeneral(true);
  }

  function changeGeneral(field: keyof typeof general, value: string) {
    setGeneral((current) => ({ ...current, [field]: value }));
  }

  async function saveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trip || savingGeneral) return;
    if (!general.title.trim() || !general.destination.trim()) {
      setGeneralMessage("El título y el destino son obligatorios.");
      return;
    }
    if (general.startDate && general.endDate && general.endDate < general.startDate) {
      setGeneralMessage("La fecha de finalización no puede ser anterior al inicio.");
      return;
    }
    const integerFields = ["days", "nights", "totalCapacity", "externalReservedPlaces"] as const;
    const decimalFields = ["totalDistanceKm", "elevationGain"] as const;
    for (const field of [...integerFields, ...decimalFields]) {
      const value = general[field].trim();
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0 ||
          (integerFields.includes(field as typeof integerFields[number]) && !Number.isInteger(Number(value))))) {
        setGeneralMessage("Revisá los valores numéricos: deben ser válidos y no negativos.");
        return;
      }
    }
    if (general.totalCapacity && Number(general.externalReservedPlaces || 0) > Number(general.totalCapacity)) {
      setGeneralMessage("Las plazas externas no pueden superar el cupo total.");
      return;
    }
    const token = localStorage.getItem("viarank_auth_token");
    if (!token) { window.location.href = "/"; return; }
    setSavingGeneral(true);
    setGeneralMessage("");
    try {
      const response = await fetch(`${API_URL}/api/travel/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: general.title.trim(),
          destination: general.destination.trim(),
          description: general.description.trim() || null,
          startDate: general.startDate || null,
          endDate: general.endDate || null,
          days: general.days || null,
          nights: general.nights || null,
          totalDistanceKm: general.totalDistanceKm || null,
          elevationGain: general.elevationGain || null,
          difficulty: general.difficulty.trim() || null,
          totalCapacity: general.totalCapacity || null,
          externalReservedPlaces: general.externalReservedPlaces || "0",
          // El precio pertenece a Valor y reserva; no se envía aquí.
        }),
      });
      const data = (await response.json()) as { error?: string; trip?: TravelTripContent };
      if (!response.ok || !data.trip) throw new Error(data.error || "No se pudo guardar el viaje.");
      setTrip((current) => current ? { ...current, ...data.trip } : current);
      setEditingGeneral(false);
      setGeneralMessage("Información general guardada correctamente.");
      returnToTrip();
    } catch (error) {
      setGeneralMessage(error instanceof Error ? error.message : "No se pudieron guardar los cambios.");
    } finally {
      setSavingGeneral(false);
    }
  }


  useEffect(() => {
    async function loadTrip() {
      const token = localStorage.getItem("viarank_auth_token");

      if (!token) {
        window.location.href = "/";
        return;
      }

      if (!tripId) {
        setMessage("No se encontró el viaje.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/travel/trips/${tripId}/content`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = (await response.json()) as ContentResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudo cargar el viaje."
          );
        }

        setTrip(data.trip);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el viaje."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadTrip();
  }, [tripId]);

  useEffect(() => {
    if (isGeneralPage && trip) {
      openGeneral();
    }
  }, [isGeneralPage, trip?.id]);

  const returnToTrip = () => {
    navigate(`/viajes/empresa/${companyId}/viajes/${tripId}`, {
      state: { companyName: location.state?.companyName },
    });
  };

  const startDate = formatDate(trip?.startDate);
  const endDate = formatDate(trip?.endDate);

  const moduleCards = trip
    ? [
        {
          title: "Información general",
          description:
            "Datos principales, fechas, duración y características del viaje.",
          active: true,
        },
        {
          title: "Alojamiento",
          description:
            "Hospedajes, modalidades y alternativas disponibles.",
          active: (trip.accommodations?.length ?? 0) > 0,
        },
        {
          title: "Recorridos y actividades",
          description:
            "Programa deportivo y actividades previstas durante el viaje.",
          active: (trip.activities?.length ?? 0) > 0,
        },
        {
          title: "Alimentación y ViaBreak",
          description:
            "Comidas previstas y organización gastronómica del viaje.",
          active: (trip.meals?.length ?? 0) > 0,
        },
        {
          title: "Transporte",
          description:
            "Traslado de pasajeros y logística general.",
          active: Boolean(trip.transport),
        },
        {
          title: "Transfers",
          description:
            "Traslados locales de llegada y salida.",
          active: (trip.transfers?.length ?? 0) > 0,
        },
        {
          title: "Seguros",
          description:
            "Cobertura y condiciones de seguro del viaje.",
          active: Boolean(trip.insurance),
        },
        {
          title: "Alquiler de equipamiento",
          description:
            "Equipamiento disponible para alquilar durante el viaje.",
          active: (trip.equipment?.length ?? 0) > 0,
        },
        {
          title: "Valor y reserva",
          description:
            "Condiciones económicas, reserva y forma de pago.",
          active: Boolean(trip.pricing) || trip.price !== null,
        },
      ]
    : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0b3559 0%, #061a30 36%, #041426 100%)",
        color: "#f8fafc",
        padding: "12px 12px 50px",
        boxSizing: "border-box",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: isGeneralPage ? "960px" : "720px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            height: "54px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                `/viajes/empresa/${companyId}/viajes`,
                {
                  state: {
                    companyName:
                      location.state?.companyName,
                  },
                }
              )
            }
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

          <div />
        </header>

        {loading ? (
          <div style={cardStyle}>
            Cargando viaje...
          </div>
        ) : message ? (
          <div
            style={{
              ...cardStyle,
              color: "#ffd5d5",
            }}
          >
            {message}
          </div>
        ) : trip ? (
          <>
            <section
              style={{
                border: "1px solid rgba(20,140,255,.55)",
                borderRadius: "20px",
                background:
                  "linear-gradient(145deg, rgba(8,43,75,.96), rgba(5,25,47,.96))",
                padding: "20px 17px",
                boxShadow:
                  "0 18px 40px rgba(0,0,0,.28)",
              }}
            >
              <div
                style={{
                  color: "#59b5ff",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: ".09em",
                }}
              >
                VIARANK VIAJES
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginTop: "7px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "28px",
                      lineHeight: 1.08,
                    }}
                  >
                    {trip.title}
                  </h1>

                  <div
                    style={{
                      marginTop: "7px",
                      color: "#a9d5ff",
                      fontSize: "16px",
                      fontWeight: 800,
                    }}
                  >
                    {trip.destination}
                  </div>
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    borderRadius: "999px",
                    padding: "6px 9px",
                    border:
                      "1px solid rgba(250,204,21,.5)",
                    background:
                      "rgba(250,204,21,.10)",
                    color: "#fde68a",
                    fontSize: "10px",
                    fontWeight: 900,
                  }}
                >
                  {statusLabel(trip.status)}
                </span>
              </div>

              {location.state?.companyName && (
                <div
                  style={{
                    marginTop: "13px",
                    color: "#8caecb",
                    fontSize: "12px",
                  }}
                >
                  Organiza: {location.state.companyName}
                </div>
              )}

              {trip.description && (
                <p
                  style={{
                    margin: "16px 0 0",
                    color: "#d3e3f1",
                    lineHeight: 1.55,
                    fontSize: "14px",
                  }}
                >
                  {trip.description}
                </p>
              )}

              {(startDate ||
                endDate ||
                trip.days ||
                trip.nights) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "16px",
                  }}
                >
                  {startDate && (
                    <span style={summaryChip}>
                      Inicio: {startDate}
                    </span>
                  )}

                  {endDate && (
                    <span style={summaryChip}>
                      Fin: {endDate}
                    </span>
                  )}

                  {trip.days != null && (
                    <span style={summaryChip}>
                      {trip.days} días
                    </span>
                  )}

                  {trip.nights != null && (
                    <span style={summaryChip}>
                      {trip.nights} noches
                    </span>
                  )}
                </div>
              )}
            </section>

            <section
              style={{
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  marginBottom: "10px",
                  color: "#ffffff",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                {isGeneralPage ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <span>Información general</span>
                    <button
                      type="button"
                      onClick={returnToTrip}
                      style={{
                        border: "1px solid #59b5ff",
                        borderRadius: 9,
                        background: "rgba(20,140,255,.12)",
                        color: "#ffffff",
                        padding: "9px 13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ‹ Volver al viaje
                    </button>
                  </div>
                ) : "Configuración del viaje"}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                {!isGeneralPage && moduleCards.map((module) => (
                  <button
                    key={module.title}
                    type="button"
                    onClick={() => {
                      if (module.title === "Información general") {
                        navigate(`/viajes/empresa/${companyId}/viajes/${tripId}/informacion-general`, { state: { companyName: location.state?.companyName } });
                      }
                      if (module.title === "Alojamiento") {
                        navigate(`/viajes/empresa/${companyId}/viajes/${tripId}/alojamiento`, { state: { companyName: location.state?.companyName } });
                      }
                    }}
                    style={{
                      ...cardStyle,
                      width: "100%",
                      textAlign: "left",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 900,
                          }}
                        >
                          {module.title}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#9fb9d3",
                            fontSize: "12px",
                            lineHeight: 1.4,
                          }}
                        >
                          {module.description}
                        </div>
                      </div>

                      <div
                        style={{
                          flexShrink: 0,
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            color: module.active
                              ? "#6ef39c"
                              : "#8aa3b8",
                            fontSize: "10px",
                            fontWeight: 900,
                          }}
                        >
                          {module.active
                            ? "CONFIGURADO"
                            : "PENDIENTE"}
                        </div>

                        <div
                          style={{
                            color: "#59b5ff",
                            fontSize: "22px",
                            lineHeight: 1,
                            marginTop: "4px",
                          }}
                        >
                          ›
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {generalMessage && (
                <p role="status" style={{ color: editingGeneral ? "#ffd6a3" : "#6ef39c", fontSize: 13 }}>
                  {generalMessage}
                </p>
              )}
              {isGeneralPage && editingGeneral && (
                <form onSubmit={saveGeneral} style={{ ...cardStyle, marginTop: 12, display: "grid", gap: 13 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Editar información general</h2>
                  <p style={{ margin: 0, color: "#a9c8e3", fontSize: 12 }}>
                    Los campos de capacidad son internos de la administración. El valor del viaje se configura en otro módulo.
                  </p>
                  {([
                    ["title", "Título del viaje", "text"],
                    ["destination", "Destino", "text"],
                    ["description", "Descripción", "textarea"],
                    ["startDate", "Fecha de inicio", "date"],
                    ["endDate", "Fecha de finalización", "date"],
                    ["days", "Cantidad de días", "number"],
                    ["nights", "Cantidad de noches", "number"],
                    ["totalDistanceKm", "Distancia total estimada (km)", "decimal"],
                    ["elevationGain", "Desnivel acumulado estimado (m)", "decimal"],
                    ["difficulty", "Dificultad", "text"],
                    ["totalCapacity", "Cupo total del viaje", "number"],
                    ["externalReservedPlaces", "Plazas reservadas fuera de ViaRank", "number"],
                  ] as const).map(([field, label, kind]) => (
                    <label key={field} style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>
                      <span>
                        {label}
                        {(field === "totalCapacity" || field === "externalReservedPlaces") && (
                          <span
                            title={field === "totalCapacity"
                              ? "Cantidad máxima de participantes que puede admitir este viaje. Dato interno de administración."
                              : "Lugares ya comprometidos por fuera de ViaRank. No vuelvas a contarlos como reservas hechas dentro de ViaRank."}
                            aria-label={field === "totalCapacity"
                              ? "Ayuda: capacidad máxima del viaje, dato interno"
                              : "Ayuda: plazas comprometidas por fuera de ViaRank, sin duplicarlas"}
                            style={{ marginLeft: 7, border: "1px solid #59b5ff", borderRadius: "50%", padding: "0 5px", color: "#9fd5ff", cursor: "help" }}
                          >?</span>
                        )}
                      </span>
                      {kind === "textarea" ? (
                        <textarea rows={3} value={general[field]} onChange={(e) => changeGeneral(field, e.target.value)} style={generalInputStyle} />
                      ) : (
                        <input
                          type={kind === "decimal" ? "number" : kind}
                          min={kind === "number" || kind === "decimal" ? "0" : undefined}
                          step={kind === "decimal" ? "any" : kind === "number" ? "1" : undefined}
                          required={field === "title" || field === "destination"}
                          value={general[field]}
                          onChange={(e) => changeGeneral(field, e.target.value)}
                          style={generalInputStyle}
                        />
                      )}
                    </label>
                  ))}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="submit" disabled={savingGeneral} style={generalPrimaryButtonStyle}>
                      {savingGeneral ? "Guardando..." : "GUARDAR CAMBIOS"}
                    </button>
                    <button type="button" disabled={savingGeneral} onClick={returnToTrip} style={generalSecondaryButtonStyle}>
                      CANCELAR
                    </button>
                  </div>
                </form>
              )}
            </section>

            <div
              style={{
                marginTop: "18px",
                padding: "13px 14px",
                borderRadius: "13px",
                border:
                  "1px solid rgba(20,140,255,.25)",
                background:
                  "rgba(20,140,255,.07)",
                color: "#a9c8e3",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              Esta es la vista de administración del viaje.
              Próximamente vas a poder editar cada módulo y
              previsualizar exactamente lo que verá el
              participante.
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

const summaryChip: CSSProperties = {
  padding: "6px 9px",
  borderRadius: "999px",
  border: "1px solid rgba(20,140,255,.35)",
  background: "rgba(20,140,255,.10)",
  color: "#cce7ff",
  fontSize: "11px",
  fontWeight: 800,
};
const generalInputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 9,
  border: "1px solid rgba(89,181,255,.55)", background: "#071d33",
  color: "#fff", padding: "10px 11px", fontSize: 14,
};
const generalPrimaryButtonStyle: CSSProperties = {
  border: 0, borderRadius: 9, background: "#148cff", color: "#fff",
  padding: "11px 15px", fontWeight: 900, cursor: "pointer",
};
const generalSecondaryButtonStyle: CSSProperties = {
  border: "1px solid #59b5ff", borderRadius: 9, background: "transparent",
  color: "#d5eaff", padding: "11px 15px", fontWeight: 800, cursor: "pointer",
};
