import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";
const API_URL = import.meta.env.VITE_API_URL;
const ActivityTracking = registerPlugin<{
  startTracking(): Promise<{ started: boolean }>;
getTrackingStatus(): Promise<{
  distance: number;
  startTime: number;
  movingTime: number;
}>;
  stopTracking(): Promise<{
  stopped: boolean;
  distance: number;
  startTime: number;
  endTime: number;
  duration: number;
  movingTime: number;
}>;
}>("ActivityTracking");
type PuntoGPS = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

function distanciaMetros(a: PuntoGPS, b: PuntoGPS) {
  const R = 6371000;
  const rad = (valor: number) => (valor * Math.PI) / 180;

  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatearTiempo(segundos: number) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segundosRestantes = segundos % 60;

  return [horas, minutos, segundosRestantes]
    .map((valor) => String(valor).padStart(2, "0"))
    .join(":");
}
type ActividadPendiente = {
  externalId: string;
  type: "RIDE" | "RUN" | "WALK" | "HIKE" | "SWIM" | "WHEELCHAIR" | "KAYAK" | "ROW" | "SAIL" | "WINDSURF";
  distance: number;
  movingTime: number;
  startDate: string;
  gpsPoints: PuntoGPS[];
};
function nombreDeporte(type: string) {
  const nombres: Record<string, string> = {
    RIDE: "ciclismo",
    RUN: "carrera",
    WALK: "caminata",
    HIKE: "senderismo",
    SWIM: "natación",
    WHEELCHAIR: "silla de ruedas",
    KAYAK: "kayak",
    ROW: "remo",
    SAIL: "vela",
    WINDSURF: "windsurf",
  };

  return nombres[type] || "actividad";
}

export default function RecordActivity() {
  const navigate = useNavigate();
  const location = useLocation();
const [deporte, setDeporte] = useState<"RIDE" | "RUN" | "WALK" | "HIKE" | "SWIM" | "WHEELCHAIR" | "KAYAK" | "ROW" | "SAIL" | "WINDSURF">("RIDE");
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [distancia, setDistancia] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState(
  "Preparado para registrar una actividad."
);

  const watchId = useRef<string | null>(null);
  const ultimoPunto = useRef<PuntoGPS | null>(null);
  const puntosGPS = useRef<PuntoGPS[]>([]);
  const inicioWeb = useRef<number | null>(null);
  const distanciaWeb = useRef(0);
  const esNativo = Capacitor.isNativePlatform();

useEffect(() => {
  if (!registrando) return;

  const intervalo = window.setInterval(async () => {
    if (esNativo) {
      const estado = await ActivityTracking.getTrackingStatus();
      setDistancia(estado.distance);
      setTiempo(estado.movingTime);
    } else if (inicioWeb.current !== null) {
      setDistancia(distanciaWeb.current);
      setTiempo(
        Math.max(0, Math.floor((Date.now() - inicioWeb.current) / 1000))
      );
    }
  }, 1000);

  return () => window.clearInterval(intervalo);
}, [registrando, esNativo]);
  const iniciar = async () => {
    try {
      if (esNativo) {
      const permisos = await Geolocation.requestPermissions();

      if (permisos.location !== "granted") {
        setMensaje("ViaRank necesita permiso de ubicación.");
        return;
      }
      }

      setDistancia(0);
      setTiempo(0);
      distanciaWeb.current = 0;
      inicioWeb.current = Date.now();
      ultimoPunto.current = null;
      puntosGPS.current = [];
      setRegistrando(true);
      setMensaje(`Registrando ${nombreDeporte(deporte)}...`);

      if (esNativo) {
        await ActivityTracking.startTracking();
      }
      watchId.current = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (posicion, error) => {
          if (error || !posicion) {
            return;
          }

          const nuevoPunto = {
            latitude: posicion.coords.latitude,
            longitude: posicion.coords.longitude,
            timestamp: posicion.timestamp,
          };

          if (ultimoPunto.current) {
            const metros = distanciaMetros(
              ultimoPunto.current,
              nuevoPunto
            );

            if (metros >= 2 && metros <= 100 && !esNativo) {
              distanciaWeb.current += metros;
              setDistancia(distanciaWeb.current);
            }
          }

          puntosGPS.current.push(nuevoPunto);
          ultimoPunto.current = nuevoPunto;
        setMensaje(
          `Registrando ${nombreDeporte(deporte)}. Precisión GPS: ${Math.round(posicion.coords.accuracy)} m`
        );
      }
    );
                 
    } catch (error) {
      console.error(error);
      setRegistrando(false);
      setMensaje("No pudimos iniciar el GPS.");
    }
  };

   const finalizar = async () => {
    let resultado;

    try {
      if (esNativo) {
        resultado = await ActivityTracking.stopTracking();
      } else {
        const startTime = inicioWeb.current ?? Date.now();
        const endTime = Date.now();
        const movingTime = Math.max(
          0,
          Math.floor((endTime - startTime) / 1000)
        );

        resultado = {
          stopped: true,
          distance: distanciaWeb.current,
          startTime,
          endTime,
          duration: movingTime,
          movingTime,
        };
      }

      if (watchId.current !== null) {
        await Geolocation.clearWatch({ id: watchId.current });
        watchId.current = null;
      }

      ultimoPunto.current = null;
      setRegistrando(false);

      const actividad: ActividadPendiente = {
        externalId: `viarank-${resultado.startTime}`,
        type: deporte,
        distance: resultado.distance,
        movingTime: resultado.movingTime,
        startDate: new Date(resultado.startTime).toISOString(),
        gpsPoints: puntosGPS.current,
      };

      const clavePendientes = "viarank_pending_activities";

      const pendientesActuales: ActividadPendiente[] = JSON.parse(
        localStorage.getItem(clavePendientes) || "[]"
      );

      const pendientesSinDuplicar = pendientesActuales.filter(
        (item) => item.externalId !== actividad.externalId
      );

      localStorage.setItem(
        clavePendientes,
        JSON.stringify([...pendientesSinDuplicar, actividad])
      );

      const respuesta = await fetch(`${API_URL}/api/activities/viarank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
        },
        body: JSON.stringify(actividad),
      });

      if (!respuesta.ok) {
        throw new Error(`Error del servidor: ${respuesta.status}`);
      }

      const pendientesGuardados: ActividadPendiente[] = JSON.parse(
        localStorage.getItem(clavePendientes) || "[]"
      );

      localStorage.setItem(
        clavePendientes,
        JSON.stringify(
          pendientesGuardados.filter(
            (item) => item.externalId !== actividad.externalId
          )
        )
      );

      setDistancia(resultado.distance);
      setTiempo(resultado.movingTime);
      setMensaje("Actividad guardada correctamente.");
    } catch (error) {
      console.error("Error al finalizar actividad ViaRank:", error);

      if (watchId.current !== null) {
        try {
          await Geolocation.clearWatch({ id: watchId.current });
        } catch {}
        watchId.current = null;
      }

      ultimoPunto.current = null;
      setRegistrando(false);
      setMensaje(
        "La actividad quedó guardada en el teléfono y se enviará cuando haya conexión."
      );
    }
  };

  const velocidadPromedio = tiempo > 0 ? (distancia / tiempo) * 3.6 : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#071426",
        color: "#f8fafc",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/", { state: { internalReturn: true, user: location.state?.user } })}
          disabled={registrando}
          style={{
            border: "none",
            background: "transparent",
            color: "#148cff",
            fontSize: "16px",
            cursor: registrando ? "default" : "pointer",
            padding: "8px 0",
            opacity: registrando ? 0.5 : 1,
          }}
        >
          ← Volver
        </button>

        <h1 style={{ marginTop: "24px" }}>Registrar actividad</h1>

        <div style={{ marginTop: "32px", position: "relative" }}>
          {(() => {
            const deportes = [
              { type: "RIDE", nombre: "Ciclismo" },
              { type: "RUN", nombre: "Carrera" },
              { type: "WALK", nombre: "Caminata" },
              { type: "HIKE", nombre: "Senderismo" },
              { type: "SWIM", nombre: "Natación" },
              { type: "WHEELCHAIR", nombre: "Silla de ruedas" },
              { type: "KAYAK", nombre: "Kayak" },
              { type: "ROW", nombre: "Remo" },
              { type: "SAIL", nombre: "Vela" },
              { type: "WINDSURF", nombre: "Windsurf" },
            ] as const;

            const deporteActual =
              deportes.find((item) => item.type === deporte) ?? deportes[0];

            return (
              <>
                <button
                  type="button"
                  disabled={registrando}
                  onClick={() => setSelectorAbierto((abierto) => !abierto)}
                  style={{
                    width: "100%",
                    padding: "15px 18px",
                    border: "1px solid #148cff",
                    borderRadius: "12px",
                    background: "#0c2945",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "17px",
                    fontWeight: 800,
                    cursor: registrando ? "default" : "pointer",
                    opacity: registrando ? 0.7 : 1,
                  }}
                >
                  <span>{deporteActual.nombre}</span>
                  <span style={{ color: "#38bdf8", fontSize: "18px" }}>
                    {selectorAbierto ? "▲" : "▼"}
                  </span>
                </button>

                {selectorAbierto && !registrando && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      maxHeight: "360px",
                      overflowY: "auto",
                      border: "1px solid #148cff",
                      borderRadius: "12px",
                      background: "#071b30",
                      boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
                    }}
                  >
                    {deportes.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setDeporte(item.type);
                          setSelectorAbierto(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "13px 18px",
                          border: "none",
                          borderBottom: "1px solid #173b59",
                          background:
                            deporte === item.type ? "#148cff" : "transparent",
                          color: "#ffffff",
                          textAlign: "left",
                          fontSize: "16px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {item.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <div
          style={{
            marginTop: "28px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "20px 10px",
              border: "1px solid #148cff",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Tiempo</div>
            <div style={{ marginTop: "8px", fontSize: "26px", fontWeight: 800 }}>
              {formatearTiempo(tiempo)}
            </div>
          </div>

          <div
            style={{
              padding: "20px 10px",
              border: "1px solid #148cff",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Distancia</div>
            <div style={{ marginTop: "8px", fontSize: "26px", fontWeight: 800 }}>
              {(distancia / 1000).toFixed(2)}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>km</div>
          </div>

          <div
            style={{
              padding: "20px 10px",
              border: "1px solid #148cff",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Velocidad promedio</div>
            <div style={{ marginTop: "8px", fontSize: "26px", fontWeight: 800 }}>
              {velocidadPromedio.toFixed(1)}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>km/h</div>
          </div>
        </div>

        <p
          style={{
            minHeight: "52px",
            lineHeight: 1.6,
            color: "#cbd5e1",
            marginTop: "24px",
          }}
        >
          {mensaje}
        </p>

        {!registrando ? (
          <button
            onClick={iniciar}
            style={{
              width: "100%",
              padding: "16px",
              border: "1px solid #148cff",
              borderRadius: "12px",
              background: "#148cff",
              color: "white",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            INICIAR
          </button>
        ) : (
          <button
            onClick={finalizar}
            style={{
              width: "100%",
              padding: "16px",
              border: "1px solid #ef4444",
              borderRadius: "12px",
              background: "#ef4444",
              color: "white",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            FINALIZAR
          </button>
        )}
      </div>
    </div>
  );
}
