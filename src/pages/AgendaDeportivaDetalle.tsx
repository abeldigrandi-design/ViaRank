import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

const API_URL = import.meta.env.VITE_API_URL;

type Evento = {
  id: string;
  title: string;
  eventDate: string;
  endDate: string | null;
  locality: string;
  description: string;
  organizer: string;
  websiteUrl: string;
  sports: string[];
  isActive: boolean;
};

const tarjeta: CSSProperties = {
  border: "1px solid rgba(20,140,255,0.55)",
  background: "linear-gradient(145deg,#0a3155,#061a30)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 22px rgba(0,0,0,0.2)",
};

function mostrarFecha(valor: string): string {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "Fecha no disponible"
    : fecha.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

export default function AgendaDeportivaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sport = searchParams.get("sport") || "";

  async function abrirSitioOficial(url: string) {
    const enlace = url.trim();

    if (!/^https?:\/\//i.test(enlace)) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: enlace });
    } else {
      window.open(enlace, "_blank", "noopener,noreferrer");
    }
  }

  const [evento, setEvento] = useState<Evento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");
      setEvento(null);

      try {
        const respuesta = await fetch(`${API_URL}/api/agenda-deportiva?sport=${encodeURIComponent(sport)}`);
        if (!respuesta.ok) {
          throw new Error("No se pudo consultar la agenda deportiva.");
        }

        const datos: unknown = await respuesta.json();

        if (!Array.isArray(datos)) {
          throw new Error("Respuesta inesperada del servidor.");
        }

        const encontrado = (datos as Evento[]).find(
          item => item.id === id
        );

        if (!encontrado) {
          throw new Error("Este evento no está disponible en la agenda.");
        }

        if (vigente) setEvento(encontrado);
      } catch (err) {
        if (vigente) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el evento."
          );
        }
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void cargar();

    return () => {
      vigente = false;
    };
  }, [id, sport]);

  return (
    <div style={{
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top,#0b3559 0%,#061a30 40%,#041426 100%)",
      color: "#f8fafc",
      padding: "16px 12px 60px",
      boxSizing: "border-box",
    }}>
      <main style={{ maxWidth: 620, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: "1px solid #148cff",
            borderRadius: 10,
            background: "linear-gradient(180deg,#1465a5,#073c72)",
            color: "#fff",
            fontWeight: 800,
            padding: "10px 16px",
            cursor: "pointer",
            marginBottom: 18,
          }}
        >
          ← Volver
        </button>

        <h1 style={{
          fontSize: 25,
          color: "#ff891c",
          textAlign: "center",
          margin: "0 0 20px",
        }}>
          Agenda deportiva
        </h1>

        {cargando && <p>Cargando información...</p>}

        {error && (
          <div role="alert" style={tarjeta}>
            {error}
          </div>
        )}

        {evento && (
          <article style={{ display: "grid", gap: 14 }}>
            <div style={tarjeta}>
              <h2 style={{
                fontSize: 22,
                margin: "0 0 18px",
                color: "#ffffff",
              }}>
                {evento.title}
              </h2>

              <div style={{ display: "grid", gap: 12, fontSize: 15 }}>
                <div>
                  <strong style={{ color: "#7dd3fc" }}>Fecha</strong>
                  <div>
                    {mostrarFecha(evento.eventDate)}
                    {evento.endDate &&
                      ` al ${mostrarFecha(evento.endDate)}`}
                  </div>
                </div>

                <div>
                  <strong style={{ color: "#7dd3fc" }}>Localidad</strong>
                  <div>{evento.locality}</div>
                </div>

                <div>
                  <strong style={{ color: "#7dd3fc" }}>Descripción</strong>
                  <p style={{
                    margin: "5px 0 0",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}>
                    {evento.description}
                  </p>
                </div>

                <div>
                  <strong style={{ color: "#7dd3fc" }}>Organizador</strong>
                  <div>{evento.organizer}</div>
                </div>
              </div>
            </div>

            <div style={tarjeta}>
              <p style={{
                color: "#cbd5e1",
                fontSize: 13,
                lineHeight: 1.6,
                margin: "0 0 15px",
              }}>
                ViaRank difunde esta información con fines informativos.
                La organización, las inscripciones y los datos oficiales
                del evento son responsabilidad de sus organizadores.
                Consultá el sitio oficial para obtener información actualizada.
              </p>

              {evento.websiteUrl?.trim() && (
              <a
                href={evento.websiteUrl}
                onClick={(e) => {
                  e.preventDefault();
                  void abrirSitioOficial(evento.websiteUrl);
                }}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "13px",
                  borderRadius: 11,
                  border: "1px solid #148cff",
                  background: "linear-gradient(180deg,#1465a5,#073c72)",
                  boxShadow: "0 4px 0 #052b51",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Visitar sitio oficial del organizador
              </a>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}