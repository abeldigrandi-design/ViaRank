import { useEffect, useRef, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { registerPlugin } from "@capacitor/core";
const API_URL = import.meta.env.VITE_API_URL;
const ActivityTracking = registerPlugin<{
  startTracking(): Promise<{ started: boolean }>;
getTrackingStatus(): Promise<{
  distance: number;
  startTime: number;
}>;
  stopTracking(): Promise<{
  stopped: boolean;
  distance: number;
  startTime: number;
  endTime: number;
  duration: number;
}>;
}>("ActivityTracking");
type PuntoGPS = {
  latitude: number;
  longitude: number;
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

export default function RecordActivity() {
const [deporte, setDeporte] = useState<"WALK" | "RIDE">("WALK");
  const [registrando, setRegistrando] = useState(false);
  const [distancia, setDistancia] = useState(0);
  const [mensaje, setMensaje] = useState(
  "Preparado para registrar una actividad."
);

  const watchId = useRef<string | null>(null);
  const ultimoPunto = useRef<PuntoGPS | null>(null);
useEffect(() => {
  if (!registrando) return;

  const intervalo = window.setInterval(async () => {
    const estado = await ActivityTracking.getTrackingStatus();
    setDistancia(estado.distance);
  }, 1000);

  return () => window.clearInterval(intervalo);
}, [registrando]);
  const iniciar = async () => {
    try {
      const permisos = await Geolocation.requestPermissions();

      if (permisos.location !== "granted") {
        setMensaje("ViaRank necesita permiso de ubicación.");
        return;
      }

      setDistancia(0);
      ultimoPunto.current = null;
      setRegistrando(true);
      setMensaje(
  deporte === "RIDE"
    ? "Registrando ciclismo..."
    : "Registrando caminata..."
);

await ActivityTracking.startTracking();
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
          };

          if (ultimoPunto.current) {
            const metros = distanciaMetros(
              ultimoPunto.current,
              nuevoPunto
            );

            if (metros >= 2 && metros <= 100) {
              // setDistancia((actual) => actual + metros);
            }
          }

          ultimoPunto.current = nuevoPunto;
setMensaje(
  deporte === "RIDE"
    ? `Registrando ciclismo. Precisión GPS: ${Math.round(posicion.coords.accuracy)} m`
    : `Registrando caminata. Precisión GPS: ${Math.round(posicion.coords.accuracy)} m`
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
      resultado = await ActivityTracking.stopTracking();

      if (watchId.current !== null) {
        await Geolocation.clearWatch({ id: watchId.current });
        watchId.current = null;
      }

      ultimoPunto.current = null;
      setRegistrando(false);

      const respuesta = await fetch(`${API_URL}/api/activities/viarank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
        },
        body: JSON.stringify({
          externalId: `viarank-${resultado.startTime}`,
          type: deporte,
          distance: resultado.distance,
          movingTime: resultado.duration,
          startDate: new Date(resultado.startTime).toISOString(),
        }),
      });

      if (!respuesta.ok) {
        throw new Error(`Error del servidor: ${respuesta.status}`);
      }

      setDistancia(resultado.distance);
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
      setMensaje("La actividad finalizó, pero no se pudo guardar.");
    }
  };

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
          onClick={() => (window.location.href = "/")}
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

       <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
  <button
    onClick={() => setDeporte("WALK")}
    disabled={registrando}
    style={{
      flex: 1,
      padding: "14px",
      border: `1px solid ${deporte === "WALK" ? "#148cff" : "#475569"}`,
      borderRadius: "12px",
      background: deporte === "WALK" ? "#148cff" : "transparent",
      color: "white",
      fontSize: "18px",
      cursor: registrando ? "default" : "pointer",
    }}
  >
    🚶 Caminata
  </button>

  <button
    onClick={() => setDeporte("RIDE")}
    disabled={registrando}
    style={{
      flex: 1,
      padding: "14px",
      border: `1px solid ${deporte === "RIDE" ? "#148cff" : "#475569"}`,
      borderRadius: "12px",
      background: deporte === "RIDE" ? "#148cff" : "transparent",
      color: "white",
      fontSize: "18px",
      cursor: registrando ? "default" : "pointer",
    }}
  >
    🚴 Ciclismo
  </button>
</div>

        <div
          style={{
            marginTop: "28px",
            padding: "24px",
            border: "1px solid #148cff",
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", fontWeight: 700 }}>
            {(distancia / 1000).toFixed(2)}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "20px" }}>km</div>
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