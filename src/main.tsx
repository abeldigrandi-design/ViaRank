import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import "./index.css";
import App from "./App";
import ExchangeToken from "./pages/ExchangeToken";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/exchange_token"
        element={<ExchangeToken />}
      />
    </Routes>
  </BrowserRouter>
);
