type Props = {
  onBack: () => void;
};

export default function SuperAdminPage({ onBack }: Props) {
  const sections = [
    {
      title: "Grupos",
      description: "Administrar todos los grupos públicos y privados de ViaRank.",
      icon: "👥",
    },
    {
      title: "Usuarios",
      description: "Consultar y administrar los usuarios registrados.",
      icon: "👤",
    },
    {
      title: "Publicidad",
      description: "Administrar campañas y espacios publicitarios.",
      icon: "📢",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020b18",
        color: "#f8fafc",
        padding: "20px 14px 40px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "515px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: "1px solid #148cff",
            background: "#071d38",
            color: "#ffffff",
            borderRadius: "10px",
            padding: "9px 14px",
            cursor: "pointer",
            fontWeight: 700,
            marginBottom: "22px",
          }}
        >
          ← Volver
        </button>

        <div
          style={{
            background:
              "linear-gradient(135deg, #071d38 0%, #0a2b50 55%, #0d3158 100%)",
            border: "1px solid #148cff",
            borderRadius: "20px",
            padding: "22px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.30)",
          }}
        >
          <div
            style={{
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "1.4px",
              marginBottom: "6px",
            }}
          >
            VIARANK
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "27px",
              fontWeight: 900,
            }}
          >
            SUPER_ADMIN
          </h1>

          <p
            style={{
              margin: "8px 0 22px",
              color: "#b8c7da",
              lineHeight: 1.45,
            }}
          >
            Administración general de la plataforma.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {sections.map((section) => (
              <button
                key={section.title}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  textAlign: "left",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid rgba(20,140,255,0.65)",
                  background: "#071d38",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: "25px",
                    width: "34px",
                    textAlign: "center",
                  }}
                >
                  {section.icon}
                </span>

                <span style={{ flex: 1 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "4px",
                    }}
                  >
                    {section.title}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      color: "#9fb5cc",
                      fontSize: "13px",
                      lineHeight: 1.35,
                    }}
                  >
                    {section.description}
                  </span>
                </span>

                <span
                  style={{
                    color: "#38bdf8",
                    fontSize: "22px",
                    fontWeight: 900,
                  }}
                >
                  ›
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}