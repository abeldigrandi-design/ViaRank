import { Request, Response } from "express";
import axios from "axios";
import { saveUser } from "../services/user.service";

export async function getAthlete(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Token no enviado",
      });
    }

    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Guardar o actualizar el usuario en PostgreSQL
    const user = await saveUser(response.data);

    console.log(
      `✅ Usuario guardado: ${user.firstName} ${user.lastName}`
    );

    return res.json(response.data);

  } catch (error: any) {
    console.error("Error obteniendo atleta:");
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      error: "No se pudo obtener el atleta",
    });
  }
}
