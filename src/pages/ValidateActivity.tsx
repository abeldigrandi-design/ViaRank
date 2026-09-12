import { useNavigate } from "react-router-dom";
import { loginWithStrava } from "../services/strava";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";
export default function ValidateActivity() {
  const navigate = useNavigate();

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
              <div
                style={{
                  width: "150px",
                  height: "150px",
                  margin: "0 auto 24px",
                  borderRadius: "28px",
                  background:
                    "linear-gradient(135deg, #ff7a00 0%, #fc4c02 55%, #ff3300 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 12px 30px rgba(252,76,2,0.32)",
                }}
              >
                <svg
                  width="88"
                  height="88"
                  viewBox="0 0 100 100"
                  aria-label="Strava"
                >
                  <polygon
                    points="50,10 78,60 61,60 50,40 39,60 22,60"
                    fill="white"
                  />
                  <polygon
                    points="61,60 78,60 65,90 50,64"
                    fill="#ffd2c2"
                  />
                </svg>
              </div>

              <button
                onClick={loginWithStrava}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  border: "1px solid #ff7a00",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #ff7a00 0%, #fc4c02 55%, #ff3300 100%)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "16px",
                  cursor: "pointer",
                  
                }}
              >
                Conectar con Strava
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