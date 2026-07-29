import { API_URL } from "./api";

export async function getAthlete() {
  const token = localStorage.getItem("strava_token");

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/athlete`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Error del servidor:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error conectando con el backend:", error);
    return null;
  }
}
