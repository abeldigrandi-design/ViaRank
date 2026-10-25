export type WeatherLocation = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export async function searchWeatherLocations(
  name: string
): Promise<WeatherLocation[]> {
  const query = name.trim();

  if (query.length < 3) return [];

  const url = new URL(
    "https://geocoding-api.open-meteo.com/v1/search"
  );

  url.searchParams.set("name", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("No se pudieron buscar localidades.");
  }

  const data = await response.json();

  return Array.isArray(data.results)
    ? data.results
    : [];
}

export type EventWeatherForecast = {
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  windGusts: number;
  time: string;
};

export async function getEventWeatherForecast(
  location: { latitude: number; longitude: number },
  eventDate: string,
  departureTime: string
): Promise<EventWeatherForecast | null> {
  if (!eventDate || !departureTime) return null;

  const requestedTime = `${eventDate}T${departureTime.slice(0, 2)}:00`;

  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "precipitation_probability",
      "precipitation",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(",")
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", eventDate);
  url.searchParams.set("end_date", eventDate);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("No se pudo consultar el pronóstico.");
  }

  const data = await response.json();
  const hourly = data.hourly;

  if (!hourly || !Array.isArray(hourly.time)) return null;

  const index = hourly.time.indexOf(requestedTime);

  if (index === -1) return null;

  const values = [
    hourly.temperature_2m?.[index],
    hourly.precipitation_probability?.[index],
    hourly.precipitation?.[index],
    hourly.wind_speed_10m?.[index],
    hourly.wind_gusts_10m?.[index],
  ];

  if (values.some((value) => typeof value !== "number")) {
    return null;
  }

  return {
    temperature: values[0],
    precipitationProbability: values[1],
    precipitation: values[2],
    windSpeed: values[3],
    windGusts: values[4],
    time: requestedTime,
  };
}