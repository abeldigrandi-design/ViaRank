import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

import athleteRoutes from "./routes/athlete.routes";

dotenv.config();

console.log("⭐⭐⭐ ESTE ES MI INDEX.TS ⭐⭐⭐");
console.log("CLIENT_ID:", process.env.STRAVA_CLIENT_ID);
console.log(
  "SECRET longitud:",
  process.env.STRAVA_CLIENT_SECRET?.length
);

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", athleteRoutes);

app.get("/", (_req, res) => {
  res.send("🚀 ViaRank Backend funcionando");
});

app.post("/exchange_token", async (req, res) => {
  try {
    const { code } = req.body;

    console.log("📥 Código recibido:", code);

    const tokenResponse = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }
    );

    console.log("✅ Token obtenido correctamente");

    res.json(tokenResponse.data);

  } catch (error: any) {
    console.error("❌ Error intercambiando token");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    res.status(500).json({
      error: "Error obteniendo el token de Strava",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend iniciado en http://localhost:${PORT}`);
});
