import { useEffect, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";

const API_URL = import.meta.env.VITE_API_URL;

type TravelCompany = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
  email: string | null;
  accessStatus:
    | "PENDING"
    | "TRIAL"
    | "ACTIVE"
    | "EXEMPT"
    | "SUSPENDED"
    | "EXPIRED";
  accessStartsAt: string | null;
  accessExpiresAt: string | null;
  planName: string | null;
  isPrimaryAdministrator: boolean;
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

function statusLabel(status: TravelCompany["accessStatus"]) {
  switch (status) {
    case "ACTIVE":
      return "Activa";
    case "TRIAL":
      return "Prueba";
    case "EXEMPT":
      return "Acceso autorizado";
    case "SUSPENDED":
      return "Suspendida";
    case "EXPIRED":
      return "Acceso vencido";
    default:
      return "Pendiente";
  }
}

export default function TravelCompanyPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [companies, setCompanies] = useState<TravelCompany[]>([]);
  const [activationCode, setActivationCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCompanies() {
    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/travel/companies/mine`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron cargar las empresas de ViaRank Viajes"
        );
      }

      setCompanies(
        Array.isArray(data.companies) ? data.companies : []
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las empresas de ViaRank Viajes"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  async function activateCompany() {
    const code = activationCode.trim().toUpperCase();

    if (!code) {
      setMessage("Ingresá el código de activación.");
      return;
    }

    const confirmed = window.confirm(
      `¿Activar este código con tu cuenta de ViaRank?\n\n${code}\n\nEl código podrá utilizarse una sola vez.`
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    setActivating(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/travel/companies/activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            activationCode: code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo activar la empresa"
        );
      }

      setActivationCode("");
      await loadCompanies();

      setMessage(
        `${data.company?.name || "La empresa"} fue activada correctamente.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo activar la empresa"
      );
    } finally {
      setActivating(false);
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
            onClick={() =>
              navigate("/", {
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
              color: "#59b5ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            ViaRank Viajes
          </div>

          <h1
            style={{
              margin: "5px 0 0",
              fontSize: "27px",
              fontWeight: 900,
            }}
          >
            Empresas organizadoras
          </h1>

          <p
            style={{
              margin: "7px 0 20px",
              color: "#bcd3e9",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            Administrá los viajes de tu empresa desde ViaRank.
          </p>

          {loading ? (
            <div
              style={{
                padding: "20px 0",
                color: "#bcd3e9",
                fontWeight: 700,
              }}
            >
              Cargando...
            </div>
          ) : (
            <>
              {companies.map((company) => (
                <div
                  key={company.id}
                  style={{
                    border: "1px solid rgba(20,140,255,.45)",
                    borderRadius: "14px",
                    background: "#082440",
                    padding: "15px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "19px",
                          fontWeight: 900,
                        }}
                      >
                        {company.name}
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          color: "#9fc5e8",
                          fontSize: "12px",
                        }}
                      >
                        {company.isPrimaryAdministrator
                          ? "Administrador principal"
                          : "Administrador"}
                      </div>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        padding: "5px 9px",
                        borderRadius: "999px",
                        background:
                          company.accessStatus === "ACTIVE" ||
                          company.accessStatus === "TRIAL" ||
                          company.accessStatus === "EXEMPT"
                            ? "rgba(25,223,102,.14)"
                            : "rgba(255,174,0,.14)",
                        border:
                          company.accessStatus === "ACTIVE" ||
                          company.accessStatus === "TRIAL" ||
                          company.accessStatus === "EXEMPT"
                            ? "1px solid rgba(25,223,102,.5)"
                            : "1px solid rgba(255,174,0,.5)",
                        color:
                          company.accessStatus === "ACTIVE" ||
                          company.accessStatus === "TRIAL" ||
                          company.accessStatus === "EXEMPT"
                            ? "#6ef39c"
                            : "#ffd166",
                        fontSize: "11px",
                        fontWeight: 900,
                      }}
                    >
                      {statusLabel(company.accessStatus)}
                    </span>
                  </div>

                  {company.description && (
                    <p
                      style={{
                        margin: "12px 0 0",
                        color: "#c5d9ec",
                        fontSize: "13px",
                        lineHeight: 1.5,
                      }}
                    >
                      {company.description}
                    </p>
                  )}

                  {(company.accessStatus === "ACTIVE" ||
                    company.accessStatus === "TRIAL" ||
                    company.accessStatus === "EXEMPT") && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(20,140,255,.10)",
                        color: "#a9d5ff",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      Empresa habilitada para administrar ViaRank
                      Viajes.
                    </div>
                  )}

                  {(company.accessStatus === "ACTIVE" ||
                    company.accessStatus === "TRIAL" ||
                    company.accessStatus === "EXEMPT") && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/viajes/empresa/${company.id}/viajes`,
                          {
                            state: {
                              companyName: company.name,
                            },
                          }
                        )
                      }
                      style={{
                        width: "100%",
                        marginTop: "12px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(20,140,255,.65)",
                        background:
                          "linear-gradient(90deg, #087dff, #148cff)",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      ADMINISTRAR VIAJES
                    </button>
                  )}
                </div>
              ))}

              {companies.length === 0 && (
                <div
                  style={{
                    padding: "13px",
                    marginBottom: "18px",
                    borderRadius: "11px",
                    background: "rgba(20,140,255,.08)",
                    border: "1px solid rgba(20,140,255,.25)",
                    color: "#bcd3e9",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  Si ViaRank ya autorizó a tu empresa, ingresá el
                  código recibido para habilitar la administración
                  de ViaRank Viajes.
                </div>
              )}

              <div
                style={{
                  height: "1px",
                  background: "rgba(20,140,255,.3)",
                  margin: "20px 0",
                }}
              />

              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: "19px",
                }}
              >
                Activar empresa
              </h2>

              <p
                style={{
                  margin: "0 0 14px",
                  color: "#9fb9d3",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Ingresá el código único de activación proporcionado
                por ViaRank.
              </p>

              <input
                value={activationCode}
                onChange={(event) =>
                  setActivationCode(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="Código de activación"
                autoCapitalize="characters"
                autoComplete="off"
                style={fieldStyle}
              />

              <button
                type="button"
                onClick={activateCompany}
                disabled={activating}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "13px",
                  border: 0,
                  borderRadius: "11px",
                  background:
                    "linear-gradient(90deg, #087dff, #148cff)",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 900,
                  cursor: activating
                    ? "not-allowed"
                    : "pointer",
                  opacity: activating ? 0.7 : 1,
                }}
              >
                {activating
                  ? "Activando..."
                  : "ACTIVAR EMPRESA"}
              </button>
            </>
          )}

          {message && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 12px",
                borderRadius: "9px",
                background: "rgba(20,140,255,.12)",
                color: "#cfe8ff",
                fontSize: "13px",
                fontWeight: 700,
                lineHeight: 1.45,
              }}
            >
              {message}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}