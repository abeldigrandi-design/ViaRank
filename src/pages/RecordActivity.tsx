import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";
const API_URL = import.meta.env.VITE_API_URL;
const FloatingIcon = registerPlugin<{
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  show(): Promise<{ requested: boolean }>;
  hide(): Promise<{ stopped: boolean }>;
}>("FloatingIcon");
const ActivityTracking = registerPlugin<{
  startTracking(options: { sport: string }): Promise<{ started: boolean }>;
  getRoutePoints(): Promise<{ points: PuntoGPS[] }>;
getTrackingStatus(): Promise<{
  trackingActivo: boolean;
  sport: string;
  distance: number;
  startTime: number;
  movingTime: number;
  duration: number;
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
const tiposDeporte = [
  "RIDE", "RUN", "WALK", "HIKE", "SWIM",
  "WHEELCHAIR", "KAYAK", "ROW", "SAIL", "WINDSURF"
] as const;

type TipoDeporte = (typeof tiposDeporte)[number];

const deporteOrigen = location.state?.returnSport;
const deporteInicial: TipoDeporte =
  tiposDeporte.includes(deporteOrigen as TipoDeporte)
    ? deporteOrigen as TipoDeporte
    : "RIDE";

const [deporte, setDeporte] = useState<TipoDeporte>(deporteInicial);
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

  // Recuperar una actividad GPS que sigue en curso.
  useEffect(() => {
    if (!esNativo) return;

    let cancelado = false;

    const recuperarActividad = async () => {
      try {
        const estado = await ActivityTracking.getTrackingStatus();

        if (!cancelado && estado.trackingActivo && estado.startTime > 0) {
          if (tiposDeporte.includes(estado.sport as TipoDeporte)) {
            setDeporte(estado.sport as TipoDeporte);
          }
          setDistancia(estado.distance);
          setTiempo(estado.movingTime);
          setRegistrando(true);
          setMensaje("Actividad en curso recuperada.");
        }
      } catch (error) {
        console.warn("No se pudo consultar el estado GPS:", error);
      }
    };

    void recuperarActividad();

    return () => {
      cancelado = true;
    };
  }, [esNativo]);

  const solicitarPermisoIconoFlotante = async () => {
    if (!esNativo) return;

    try {
      const permiso = await FloatingIcon.checkPermission();

      if (!permiso.granted) {
        await FloatingIcon.requestPermission();
      }
    } catch (error) {
      console.warn("No se pudo solicitar el permiso flotante:", error);
    }
  };

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
        await ActivityTracking.startTracking({ sport: deporte });

        // Icono flotante opcional: nunca debe interrumpir el GPS.
        try {
          const permisoFlotante = await FloatingIcon.checkPermission();

          if (permisoFlotante.granted) {
            await FloatingIcon.show();
          }
        } catch (errorFlotante) {
          console.warn("Icono flotante no disponible:", errorFlotante);
        }
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

        // Ocultar el icono flotante al finalizar el GPS.
        try {
          await FloatingIcon.hide();
        } catch (errorFlotante) {
          console.warn("No se pudo ocultar el icono flotante:", errorFlotante);
        }
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
      // Recuperar las coordenadas conservadas por Android.
      if (esNativo) {
        try {
          const recorridoNativo = await ActivityTracking.getRoutePoints();
          if (recorridoNativo.points.length > 0) {
            puntosGPS.current = recorridoNativo.points;
          }
        } catch (errorRuta) {
          console.warn("No se pudo recuperar el recorrido GPS:", errorRuta);
        }
      }


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
        padding: "10px 16px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        

        <div
  className="vr-encabezado-registro"
  style={{
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "8px",
    padding: "4px 0 9px",
    marginBottom: "8px",
    borderBottom: "1px solid rgba(20,140,255,.55)",
  }}
>
  <button
    type="button"
    onClick={() => navigate(-1)}
    style={{
      justifySelf: "start",
      border: 0,
      background: "transparent",
      color: "#36a9ff",
      fontSize: "15px",
      fontWeight: 800,
      cursor: "pointer",
      padding: "8px 0",
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
      {location.state?.user?.profilePicture && (
        <img
          src={location.state.user.profilePicture}
          alt="Atleta conectado"
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
</div>
<h1 style={{ margin: "8px 0 10px", fontSize: "20px" }}>Registrar actividad</h1>

        <div
          style={{
            marginTop: "8px",
            padding: "6px 18px",
            border: "1px solid #148cff",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #10375b, #071b30)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)",
          }}
        >
          <div style={{ color: "#8acfff", fontSize: "12px", fontWeight: 700 }}>
            ACTIVIDAD SELECCIONADA
          </div>
          <div style={{ marginTop: "5px", fontSize: "23px", fontWeight: 900 }}>
            {nombreDeporte(deporte).charAt(0).toUpperCase() +
              nombreDeporte(deporte).slice(1)}
          </div>
        </div>
        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "11px 8px",
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
              padding: "11px 8px",
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
              padding: "11px 8px",
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
          <div
            aria-label={`Imagen de ${nombreDeporte(deporte)}`}
            style={{
              minHeight: "105px",
              border: "1px solid #148cff",
              borderRadius: "16px",
              overflow: "hidden",
              background: "linear-gradient(135deg, #12466d, #071426)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "52px",
                background: "radial-gradient(circle at 50% 35%, rgba(20,140,255,.25), transparent 75%)",
              }}
            >
              {({
                RIDE: "🚴",
                RUN: "🏃",
                WALK: "🚶",
                HIKE: "🥾",
                SWIM: "🏊",
                WHEELCHAIR: "♿",
                KAYAK: "🛶",
                ROW: "🚣",
                SAIL: "⛵",
                WINDSURF: "🏄",
              } as Record<TipoDeporte, string>)[deporte]}
            </div>
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
          <>
            {!esNativo && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "14px 16px",
                  border: "1px solid #f59e0b",
                  borderRadius: "12px",
                  background: "rgba(245, 158, 11, 0.10)",
                  color: "#f8fafc",
                  fontSize: "14px",
                  lineHeight: 1.55,
                }}
              >
                <div
                  style={{
                    color: "#fbbf24",
                    fontWeight: 800,
                    marginBottom: "6px",
                  }}
                >
                  Registro desde la web
                </div>
                Momentáneamente, mientras completamos la habilitación de
                ViaRank para su distribución en Google Play, el registro
                desde la web requiere mantener la pantalla activa para
                registrar correctamente la distancia.
                <div style={{ marginTop: "8px", fontWeight: 700 }}>
                  Recomendamos no utilizar esta opción para actividades
                  prolongadas.
                </div>
                <div style={{ marginTop: "8px", color: "#cbd5e1" }}>
                  Próximamente, desde la app ViaRank para Android, podrás
                  registrar tu actividad con la pantalla apagada y reducir
                  el consumo de batería.
                </div>
              </div>
            )}
            <button
  onClick={iniciar}
  style={{
    width: "100%",
    height: "54px",
    padding: "0 12px",
    border: "1px solid #9bffc4",
    borderRadius: "13px",
    background: "linear-gradient(180deg, #6affae 0%, #18c86b 19%, #078b48 58%, #03512d 100%)",
    boxShadow: "0 5px 0 #003b22, 0 8px 16px rgba(0,0,0,.32), inset 0 2px 1px rgba(255,255,255,.55)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: ".4px",
    textShadow: "0 1px 2px rgba(0,0,0,.35)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    touchAction: "manipulation",
  }}
>
  <span aria-hidden="true" style={{ fontSize: "19px" }}>▶</span>
  <span>INICIAR ACTIVIDAD</span>
</button>

{esNativo && (
  <button
    type="button"
    onClick={solicitarPermisoIconoFlotante}
    style={{
      display: "block",
      margin: "18px auto 0",
      padding: "9px 14px",
      border: "1px solid rgba(56,189,248,.45)",
      borderRadius: "10px",
      background: "rgba(14,55,92,.65)",
      color: "#bcecff",
      fontSize: "13px",
      fontWeight: 700,
      cursor: "pointer",
      touchAction: "manipulation",
    }}
  >
    Activar ícono flotante
  </button>
)}
          </>
        ) : (
          <button
  onClick={finalizar}
  style={{
    width: "100%",
    height: "54px",
    padding: "0 12px",
    border: "1px solid #ffc0ba",
    borderRadius: "13px",
    background: "linear-gradient(180deg, #ffaaa0 0%, #f34a48 19%, #c82030 58%, #870d1c 100%)",
    boxShadow: "0 5px 0 #650915, 0 8px 16px rgba(0,0,0,.32), inset 0 2px 1px rgba(255,255,255,.5)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: ".4px",
    textShadow: "0 1px 2px rgba(0,0,0,.35)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    touchAction: "manipulation",
  }}
>
  <span aria-hidden="true" style={{ fontSize: "19px" }}>■</span>
  <span>FINALIZAR ACTIVIDAD</span>
</button>
        )}
      </div>
    </div>
  );
}
