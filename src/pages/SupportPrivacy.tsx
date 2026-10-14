import viarankLogo from "../assets/viarank-header-logo-clean.png";
import { useLocation, useNavigate } from "react-router-dom";

export default function SupportPrivacy() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#071a33",
        padding: "24px 16px 48px",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#111827",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "18px",
          }}
        >
          <img
            src={viarankLogo}
            alt="ViaRank"
            style={{
              width: "150px",
              maxWidth: "55%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        <main
          style={{
            background: "#102b4c",
            borderRadius: "18px",
            padding: "24px",
            boxShadow:
              "0 8px 30px rgba(15, 23, 42, 0.08)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              navigate("/", { state: { internalReturn: true, user: location.state?.user } });
            }}
            style={{
              border: "none",
              background: "#071a33",
              borderRadius: "10px",
              padding: "9px 14px",
              cursor: "pointer",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "22px",
            }}
          >
            ← Volver a ViaRank
          </button>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
            }}
          >
            Soporte y privacidad
          </h1>

          <p
            style={{
              margin: "0 0 28px",
              color: "#b8cde5",
              lineHeight: 1.6,
            }}
          >
            Información sobre el uso de ViaRank,
            la conexión con Strava y la gestión
            de tus datos.
          </p>

         <section style={{ marginBottom: "28px" }}>
  <h2 style={{ fontSize: "20px" }}>
    Soporte
  </h2>

  <p
    style={{
      lineHeight: 1.7,
      color: "#d1e2f5",
    }}
  >
    Si necesitás ayuda con ViaRank,
    con la conexión de tu cuenta de
    Strava o con tus datos, podés
    comunicarte por correo electrónico.
  </p>

  <a
    href="mailto:viarank.app@gmail.com"
    style={{
      display: "inline-block",
      color: "#ea580c",
      fontWeight: 700,
      textDecoration: "none",
    }}
  >
    viarank.app@gmail.com
  </a>
  <p style={{ color: "#b8cde5", marginTop: "12px" }}>Desarrollador: <strong style={{ color: "#ffffff" }}>AJD</strong></p>
</section>

          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "20px" }}>
              Conexión con Strava
            </h2>

            <p
              style={{
                lineHeight: 1.7,
                color: "#d1e2f5",
              }}
            >
              ViaRank permite conectar tu cuenta
              de Strava mediante autorización
              OAuth. ViaRank utiliza los datos
              autorizados de tus actividades
              para ofrecer sus funciones
              deportivas, estadísticas, grupos
              y rankings.
            </p>

            <p
              style={{
                lineHeight: 1.7,
                color: "#d1e2f5",
              }}
            >
              ViaRank no solicita tu contraseña
              de Strava. La autorización se
              realiza directamente mediante
              Strava.
            </p>
          </section>

          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "20px" }}>
              Privacidad
            </h2>

            <p
              style={{
                lineHeight: 1.7,
                color: "#d1e2f5",
              }}
            >
              Los datos obtenidos mediante la
              conexión con Strava se utilizan
              exclusivamente para proporcionar
              las funciones de ViaRank y se
              gestionan de acuerdo con los
              permisos otorgados por cada
              atleta.
            </p>
          </section>

          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "20px" }}>
              Desconectar Strava
            </h2>

            <p
              style={{
                lineHeight: 1.7,
                color: "#d1e2f5",
              }}
            >
              Podés retirar la autorización de
              ViaRank desde la configuración de
              aplicaciones conectadas de tu
              cuenta de Strava.
            </p>
          </section>

          <section>
  <h2 style={{ fontSize: "20px" }}>
    Eliminación de datos
  </h2>

  <p style={{ lineHeight: 1.7, color: "#d1e2f5" }}>Podés solicitar la eliminación de tu cuenta y de los datos asociados en ViaRank.</p><p style={{ lineHeight: 1.7, color: "#d1e2f5", fontWeight: 600 }}>Importante: si sos administrador de uno o más grupos, al eliminar tu cuenta también se eliminarán permanentemente esos grupos y sus membresías. Esta acción no se puede deshacer.</p>

    <button
    onClick={async () => {
      const confirmacion = window.confirm(
        "¿Seguro que querés eliminar tu cuenta? Esta acción eliminará permanentemente tu cuenta, tus actividades, tus membresías y los grupos que administrás."
      );

      if (!confirmacion) {
        return;
      }

      const confirmacionFinal = window.confirm(
        "Esta acción no se puede deshacer. ¿Querés continuar con la eliminación definitiva?"
      );

      if (!confirmacionFinal) {
        return;
      }

      try {
        const token =
          localStorage.getItem(
            "viarank_auth_token"
          );

       const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

        const response = await fetch(
          `${API_URL}/api/account`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudo eliminar la cuenta"
          );
        }

        localStorage.removeItem(
          "viarank_auth_token"
        );

        alert(
          "Tu cuenta y tus datos fueron eliminados permanentemente."
        );

        navigate("/");
      } catch (error) {
        console.error(
          "Error eliminando cuenta:",
          error
        );

        alert(
          "Ocurrió un error al eliminar la cuenta. Intentá nuevamente."
        );
      }
    }}
    style={{
      padding: "10px 16px",
      background: "#dc2626",
      color: "#ffffff",
      border: "none",
      borderRadius: "10px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Eliminar mi cuenta
  </button>
</section>

          <div
            style={{
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid #148cff",
              color: "#94a3b8",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            ViaRank es una aplicación
            independiente. Strava es una marca
            de Strava, Inc.
          </div>
        </main>
      </div>
    </div>
  );
}