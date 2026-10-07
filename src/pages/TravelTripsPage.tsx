import { useEffect, useState, type CSSProperties } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";

const API_URL = import.meta.env.VITE_API_URL;

type TravelTripStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "FINISHED"
  | "CANCELLED";

type TravelTrip = {
  id: string;
  companyId: string;
  title: string;
  destination: string;
  description: string | null;
  status: TravelTripStatus;
  isFeatured: boolean;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  nights: number | null;
  totalDistanceKm: number | null;
  elevationGain: number | null;
  difficulty: string | null;
  price: number | null;
  totalCapacity: number | null;
  externalReservedPlaces: number;
  createdAt: string;
  updatedAt: string;
};

type CompanyInfo = {
  id: string;
  name: string;
  accessStatus: string;
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px",
  borderRadius: "10px",
  border: "1px solid rgba(20,140,255,.55)",
  background: "#0a2947",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

function tripStatusLabel(status: TravelTripStatus) {
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

export default function TravelTripsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId = "" } = useParams();

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");

  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadTrips() {
    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    if (!companyId) {
      setMessage("No se encontró la empresa.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/travel/companies/${companyId}/trips`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los viajes"
        );
      }

      setCompany(data.company ?? null);
      setTrips(Array.isArray(data.trips) ? data.trips : []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los viajes"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrips();
  }, [companyId]);

  async function createTrip() {
    const normalizedTitle = title.trim();
    const normalizedDestination = destination.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) {
      setMessage("Ingresá el título del viaje.");
      return;
    }

    if (!normalizedDestination) {
      setMessage("Ingresá el destino del viaje.");
      return;
    }

    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    const confirmed = window.confirm(
      `¿Crear "${normalizedTitle}" como borrador?`
    );

    if (!confirmed) {
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/travel/companies/${companyId}/trips`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: normalizedTitle,
            destination: normalizedDestination,
            description: normalizedDescription || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo crear el viaje"
        );
      }

      setTitle("");
      setDestination("");
      setDescription("");
      setShowCreateForm(false);
      setMessage("Viaje creado como borrador.");

      await loadTrips();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear el viaje"
      );
    } finally {
      setCreating(false);
    }
  }

  function startEditingTrip(trip: TravelTrip) {
    setEditingTripId(trip.id);
    setEditTitle(trip.title);
    setEditDestination(trip.destination);
    setEditDescription(trip.description ?? "");
    setShowCreateForm(false);
    setMessage("");
  }

  function cancelEditingTrip() {
    setEditingTripId(null);
    setEditTitle("");
    setEditDestination("");
    setEditDescription("");
    setMessage("");
  }

  async function saveTrip(tripId: string) {
    const normalizedTitle = editTitle.trim();
    const normalizedDestination = editDestination.trim();
    const normalizedDescription = editDescription.trim();

    if (!normalizedTitle) {
      setMessage("Ingresá el título del viaje.");
      return;
    }

    if (!normalizedDestination) {
      setMessage("Ingresá el destino del viaje.");
      return;
    }

    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/travel/trips/${tripId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: normalizedTitle,
            destination: normalizedDestination,
            description: normalizedDescription || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el viaje");
      }

      setEditingTripId(null);
      setEditTitle("");
      setEditDestination("");
      setEditDescription("");
      setMessage("Cambios guardados correctamente.");
      await loadTrips();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el viaje"
      );
    } finally {
      setSavingEdit(false);
    }
  }

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
            marginBottom: "12px",
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate("/viajes/empresa", {
                state: {
                  internalReturn: true,
                  user: location.state?.user,
                },
              })
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

        <section
          style={{
            border: "1px solid rgba(20,140,255,.55)",
            borderRadius: "18px",
            background: "rgba(5,25,47,.88)",
            padding: "20px 16px",
            boxShadow: "0 15px 35px rgba(0,0,0,.25)",
          }}
        >
          <div
            style={{
              color: "#58b7ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: ".08em",
              marginBottom: "5px",
            }}
          >
            VIARANK VIAJES
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "25px",
              lineHeight: 1.15,
            }}
          >
            Viajes
          </h1>

          <p
            style={{
              margin: "7px 0 18px",
              color: "#a9bfd3",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {company?.name ||
              location.state?.companyName ||
              "Empresa organizadora"}
          </p>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setMessage("");
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(20,140,255,.65)",
              background: showCreateForm
                ? "#0a2947"
                : "linear-gradient(90deg, #087dff, #148cff)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
              marginBottom: "14px",
            }}
          >
            {showCreateForm ? "CANCELAR" : "+ CREAR VIAJE"}
          </button>

          {showCreateForm && (
            <div
              style={{
                border: "1px solid rgba(20,140,255,.35)",
                borderRadius: "14px",
                padding: "14px",
                background: "rgba(8,35,62,.7)",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: "12px",
                }}
              >
                Nuevo viaje
              </div>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título del viaje"
                style={{
                  ...fieldStyle,
                  marginBottom: "10px",
                }}
              />

              <input
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value)
                }
                placeholder="Destino"
                style={{
                  ...fieldStyle,
                  marginBottom: "10px",
                }}
              />

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Descripción del viaje"
                rows={4}
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                  marginBottom: "10px",
                }}
              />

              <button
                type="button"
                onClick={createTrip}
                disabled={creating}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: 0,
                  background: creating
                    ? "#31526e"
                    : "#16a34a",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating
                  ? "GUARDANDO..."
                  : "GUARDAR BORRADOR"}
              </button>
            </div>
          )}

          {message && (
            <div
              style={{
                border: "1px solid rgba(20,140,255,.35)",
                borderRadius: "10px",
                background: "rgba(20,140,255,.08)",
                padding: "10px 12px",
                color: "#d8ebff",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {message}
            </div>
          )}

          {loading ? (
            <div
              style={{
                color: "#a9bfd3",
                fontSize: "14px",
              }}
            >
              Cargando viajes...
            </div>
          ) : trips.length === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148,163,184,.4)",
                borderRadius: "12px",
                padding: "16px",
                color: "#a9bfd3",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              Esta empresa todavía no tiene viajes.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    border:
                      "1px solid rgba(20,140,255,.35)",
                    borderRadius: "14px",
                    padding: "14px",
                    background: "rgba(8,35,62,.72)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          color: "#ffffff",
                          fontWeight: 900,
                          fontSize: "16px",
                        }}
                      >
                        {trip.title}
                      </div>

                      <div
                        style={{
                          color: "#9fc4e2",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      >
                        {trip.destination}
                      </div>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        borderRadius: "999px",
                        padding: "5px 8px",
                        border:
                          "1px solid rgba(250,204,21,.5)",
                        background:
                          "rgba(250,204,21,.10)",
                        color: "#fde68a",
                        fontSize: "10px",
                        fontWeight: 900,
                      }}
                    >
                      {tripStatusLabel(trip.status)}
                    </span>
                  </div>

                  {trip.description && (
                    <div
                      style={{
                        color: "#b8c9d8",
                        fontSize: "13px",
                        lineHeight: 1.45,
                        marginTop: "10px",
                      }}
                    >
                      {trip.description}
                    </div>
                  )}

                  {editingTripId === trip.id ? (
                    <div
                      style={{
                        marginTop: "14px",
                        paddingTop: "14px",
                        borderTop: "1px solid rgba(20,140,255,.28)",
                      }}
                    >
                      <div
                        style={{
                          color: "#58b7ff",
                          fontSize: "12px",
                          fontWeight: 900,
                          marginBottom: "10px",
                        }}
                      >
                        EDITAR VIAJE
                      </div>

                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        placeholder="Título del viaje"
                        style={{ ...fieldStyle, marginBottom: "10px" }}
                      />

                      <input
                        value={editDestination}
                        onChange={(event) => setEditDestination(event.target.value)}
                        placeholder="Destino"
                        style={{ ...fieldStyle, marginBottom: "10px" }}
                      />

                      <textarea
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        placeholder="Descripción del viaje"
                        rows={4}
                        style={{
                          ...fieldStyle,
                          resize: "vertical",
                          fontFamily: "inherit",
                          marginBottom: "10px",
                        }}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={cancelEditingTrip}
                          disabled={savingEdit}
                          style={{
                            padding: "11px 8px",
                            borderRadius: "9px",
                            border: "1px solid rgba(148,163,184,.5)",
                            background: "#0a2947",
                            color: "#d8ebff",
                            fontSize: "12px",
                            fontWeight: 900,
                            cursor: savingEdit ? "default" : "pointer",
                          }}
                        >
                          CANCELAR
                        </button>

                        <button
                          type="button"
                          onClick={() => void saveTrip(trip.id)}
                          disabled={savingEdit}
                          style={{
                            padding: "11px 8px",
                            borderRadius: "9px",
                            border: 0,
                            background: savingEdit ? "#31526e" : "#16a34a",
                            color: "#ffffff",
                            fontSize: "12px",
                            fontWeight: 900,
                            cursor: savingEdit ? "default" : "pointer",
                          }}
                        >
                          {savingEdit ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditingTrip(trip)}
                      style={{
                        width: "100%",
                        marginTop: "12px",
                        padding: "10px",
                        borderRadius: "9px",
                        border: "1px solid rgba(20,140,255,.55)",
                        background: "#0a2947",
                        color: "#d8ebff",
                        fontSize: "12px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      EDITAR VIAJE
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
