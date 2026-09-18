import { createRoot } from "react-dom/client";
import { App as CapacitorApp } from "@capacitor/app";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import "./index.css";
import App from "./App";
import ExchangeToken from "./pages/ExchangeToken";
import SupportPrivacy from "./pages/SupportPrivacy";
import ValidateActivity from "./pages/ValidateActivity";
CapacitorApp.addListener("appUrlOpen", ({ url }) => {
  try {
    const incomingUrl = new URL(url);

    if (incomingUrl.pathname === "/exchange_token") {
      const code = incomingUrl.searchParams.get("code");

      if (code) {
        window.location.href =
          `/exchange_token?code=${encodeURIComponent(code)}`;
      }
    }
  } catch (error) {
    console.error("Error procesando regreso de Strava:", error);
  }
});
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/support" element={<SupportPrivacy />} />
<Route
  path="/validar-actividad"
  element={<ValidateActivity />}
/>
      <Route
        path="/exchange_token"
        element={<ExchangeToken />}
      />
    </Routes>
  </BrowserRouter>
);
