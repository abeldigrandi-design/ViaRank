import viarankLogo from "../assets/viarank-logo.png";

export default function SupportPrivacy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "24px 16px 48px",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#0f172a",
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
            background: "#0f172a",
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
            background: "#ffffff",
            borderRadius: "18px",
            padding: "24px",
            boxShadow:
              "0 8px 30px rgba(15, 23, 42, 0.08)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: "10px",
              padding: "9px 14px",
              cursor: "pointer",
              fontWeight: 700,
              color: "#334155",
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
              color: "#64748b",
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
      color: "#475569",
    }}
  >
    Si necesitás ayuda con ViaRank,
    con la conexión de tu cuenta de
    Strava o con tus datos, podés
    comunicarte por correo electrónico.
  </p>

  <a
    href="mailto:abeldigrandi@gmail.com"
    style={{
      display: "inline-block",
      color: "#ea580c",
      fontWeight: 700,
      textDecoration: "none",
    }}
  >
    abeldigrandi@gmail.com
  </a>
</section>

          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "20px" }}>
              Conexión con Strava
            </h2>

            <p
              style={{
                lineHeight: 1.7,
                color: "#475569",
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
                color: "#475569",
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
                color: "#475569",
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
                color: "#475569",
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

  <p
    style={{
      lineHeight: 1.7,
      color: "#475569",
    }}
  >
    Podés solicitar la eliminación de
    los datos asociados a tu cuenta de
    ViaRank enviando una solicitud por
    correo electrónico. Una vez recibida,
    se eliminarán los datos que
    correspondan a tu cuenta.
  </p>

  <a
    href="mailto:abeldigrandi@gmail.com?subject=Solicitud%20de%20eliminacion%20de%20datos%20-%20ViaRank"
    style={{
      display: "inline-block",
      padding: "10px 16px",
      background: "#ea580c",
      color: "#ffffff",
      borderRadius: "10px",
      fontWeight: 700,
      textDecoration: "none",
    }}
  >
    Solicitar eliminación de datos
  </a>
</section>s

          <div
            style={{
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid #e2e8f0",
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