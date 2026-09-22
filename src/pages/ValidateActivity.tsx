import { useNavigate } from "react-router-dom";
import { registerPlugin } from "@capacitor/core";
import { loginWithStrava } from "../services/strava";
import stravaConnectOfficial from "../assets/strava-connect-official.svg";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";
interface HealthConnectPlugin {
  requestHealthPermissions(): Promise<void>;
  checkPermissions(): Promise<{ exercise: boolean; distance: boolean; allGranted: boolean }>;
  readActivities(): Promise<{ count: number; activities: unknown[] }>;
  readDistances(): Promise<{ count: number; totalKilometers: number; distances: unknown[] }>;
}

const HealthConnect = registerPlugin<HealthConnectPlugin>("HealthConnect");
export default function ValidateActivity() {
  const navigate = useNavigate();
async function requestHealthConnectPermissions() {
  try {
    await HealthConnect.requestHealthPermissions();
    const permissions = await HealthConnect.checkPermissions();
    if (permissions.allGranted) {
      const result = await HealthConnect.readDistances();
      const distancias = (result.distances as any[]).slice().sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const grupos: any[][] = [];
      for (const d of distancias) {
        const ultimoGrupo = grupos[grupos.length - 1];
        const ultimoRegistro = ultimoGrupo?.[ultimoGrupo.length - 1];
        const diferenciaMinutos = ultimoRegistro ? (new Date(d.startTime).getTime() - new Date(ultimoRegistro.endTime).getTime()) / 60000 : Infinity;
        if (ultimoGrupo && diferenciaMinutos <= 3) {
          ultimoGrupo.push(d);
        } else {
          grupos.push([d]);
        }
      }
      const resumen = grupos.map((g: any[]) => ({ inicio: g[0].startTime, fin: g[g.length - 1].endTime, kilometros: g.reduce((s: number, d: any) => s + Number(d.kilometers), 0), registros: g.length, duracionMinutos: (new Date(g[g.length - 1].endTime).getTime() - new Date(g[0].startTime).getTime()) / 60000 }));
      const candidatas = resumen.filter((a: any) => a.duracionMinutos >= 5 && a.registros >= 5);
      alert("Actividades candidatas: " + candidatas.length + "\n\n" + candidatas.slice().reverse().slice(0, 10).map((a: any) => String(a.inicio) + " -> " + String(a.fin) + "\n" + a.kilometros.toFixed(3) + " km | " + a.duracionMinutos.toFixed(0) + " min | " + a.registros + " registros").join("\n\n"));
    } else {
      alert("Health Connect: faltan permisos");
    }
  } catch (error) {
    alert("Error Health Connect: " + String(error));
  }
}
  return (
    <div
      style={{
       minHeight: "100vh",
background: "#ffffff",
color: "#f8fafc",
padding: "24px 18px 40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
<div
  style={{
    maxWidth: "1050px",
    margin: "0 auto 18px",
    background: "#071d38",
    borderRadius: "18px",
    padding: "14px 22px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  }}
>
  <img
    src={viarankHeaderLogo}
    alt="ViaRank"
    style={{
      width: "285px",
      height: "58px",
      objectFit: "contain",
      objectPosition: "left center",
      display: "block",
    }}
  />
</div>
      <div
        style={{
          maxWidth: "1050px",
          margin: "0 auto",
          background: "#071d38",
          border: "1px solid #148cff",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "11px 18px",
            borderRadius: "11px",
            border: "1px solid #148cff",
            background: "#0d3158",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
            marginBottom: "28px",
          }}
        >
          ← Volver
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: "34px",
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          Validar actividad
        </h1>

        <p
          style={{
            color: "#8ecbff",
            fontSize: "17px",
            lineHeight: 1.6,
            marginTop: "10px",
            marginBottom: "30px",
          }}
        >
          Vinculá una fuente de actividad para validar tus registros deportivos
          en ViaRank.
        </p>

        {/* STRAVA */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #071d38 0%, #0d3158 72%, rgba(252,76,2,0.16) 100%)",
            border: "1px solid #fc4c02",
            borderRadius: "18px",
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "30px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: "1 1 430px",
              }}
            >
              <div
                style={{
                  color: "#fc4c02",
                  fontSize: "42px",
                  fontWeight: 900,
                  letterSpacing: "-2px",
                  marginBottom: "18px",
                }}
              >
                STRAVA
              </div>

              <h2
                style={{
                  fontSize: "25px",
                  margin: "0 0 12px 0",
                  color: "#ffffff",
                }}
              >
                Conectá tu cuenta de Strava
              </h2>

              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: "16px",
                  lineHeight: 1.65,
                  marginBottom: "22px",
                  maxWidth: "560px",
                }}
              >
                Usá Strava para importar y validar tus actividades en ViaRank.
                Los registros importados podrán utilizarse para tus rankings.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "14px",
                  fontSize: "15px",
                  color: "#f8fafc",
                }}
              >
                <div>🟠 Importá tus actividades desde Strava</div>
                <div>🟠 Validá tus registros deportivos</div>
                <div>🟠 Competí con datos verificados en los rankings</div>
              </div>
            </div>

            <div
              style={{
                flex: "0 1 340px",
                width: "100%",
                textAlign: "center",
              }}
            >
         
              
             
<button
  onClick={loginWithStrava}
  style={{
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  }}
>
  <img
    src={stravaConnectOfficial}
    alt="Connect with Strava"
    style={{
      width: "193px",
      height: "48px",
      display: "block",
    }}
  />
</button>
                            <div
                style={{
                  marginTop: "12px",
                  color: "#94a3b8",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                La conexión para nuevos atletas se habilitará cuando ampliemos
                el acceso autorizado de Strava.
              </div>
            </div>
          </div>
        </div>
<button
  onClick={requestHealthConnectPermissions}
  style={{
    marginTop: "20px",
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1px solid #148cff",
    background: "#148cff",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  Conectar con Health Connect
</button>
        {/* COMO FUNCIONA */}
        <div
          style={{
            marginTop: "24px",
            background: "#0b2a4d",
            border: "1px solid #148cff",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                minWidth: "38px",
                borderRadius: "50%",
                background: "#148cff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              i
            </div>

            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                ¿Cómo funciona?
              </div>

              <div
                style={{
                  color: "#cbd5e1",
                  lineHeight: 1.6,
                }}
              >
                Cuando una fuente de actividad esté vinculada, ViaRank podrá
                importar sus registros deportivos y utilizarlos para validar
                kilómetros, tiempos y demás datos de los rankings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
