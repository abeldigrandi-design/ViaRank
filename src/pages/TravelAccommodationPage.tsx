import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function TravelAccommodationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId = "", tripId = "" } = useParams();

  const volver = () => {
    navigate(`/viajes/empresa/${companyId}/viajes/${tripId}`, {
      state: { companyName: location.state?.companyName },
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#06182b",
      color: "#ffffff",
      padding: "24px 16px",
    }}>
      <main style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}>
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Alojamiento</h1>
            <p style={{ color: "#a9c8e3", fontSize: 14 }}>
              Administrá los hospedajes y sus características.
            </p>
          </div>

          <button type="button" onClick={volver} style={{
            border: "1px solid #59b5ff",
            borderRadius: 9,
            background: "transparent",
            color: "#d5eaff",
            padding: "11px 15px",
            fontWeight: 800,
            cursor: "pointer",
          }}>
            ‹ Volver al viaje
          </button>
        </header>

        <section style={{
          border: "1px solid rgba(89,181,255,.35)",
          background: "#0b2743",
          borderRadius: 14,
          padding: 20,
        }}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>
            Alojamientos del viaje
          </h2>

          <p style={{ color: "#a9c8e3", lineHeight: 1.6 }}>
            Aquí vas a poder agregar varios hoteles, cabañas,
            campings u otros establecimientos. Cada alojamiento
            tendrá su propia tarjeta desplegable con los datos
            de contacto, ubicación, estadía, habitaciones,
            servicios y observaciones.
          </p>
        </section>
      </main>
    </div>
  );
}