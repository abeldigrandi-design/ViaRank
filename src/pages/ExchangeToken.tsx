import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ExchangeToken() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");

    if (!code) {
      console.error("❌ No llegó el código de Strava");
      navigate("/", { replace: true });
      return;
    }

    async function exchangeToken() {
      try {
        console.log("🚀 Código recibido:", code);

        const response = await fetch("http://localhost:3001/exchange_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        console.log("Status:", response.status);

        const text = await response.text();
        console.log("Respuesta:", text);

        if (!response.ok) {
          throw new Error(text);
        }

        const data = JSON.parse(text);

        localStorage.setItem("strava_token", data.access_token);

        navigate("/", { replace: true });
      } catch (err) {
        console.error(err);
        alert("Error al conectar con Strava");
        navigate("/", { replace: true });
      }
    }

    exchangeToken();
  }, [navigate, searchParams]);

  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
      }}
    >
      <h2>Conectando con Strava...</h2>
      <p>Esperá unos segundos...</p>
    </div>
  );
}
