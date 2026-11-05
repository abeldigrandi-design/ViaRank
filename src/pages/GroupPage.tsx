import EstadoEventoPublicado from "../components/EstadoEventoPublicado";
import EstadoEvento from "../components/eventos/EstadoEvento";
import FichaInscripcionEvento from "../components/eventos/FichaInscripcionEvento";
import FichaSumarmeSalida from "../components/eventos/FichaSumarmeSalida";
import FichaEventoAtleta from "../components/eventos/FichaEventoAtleta";
import BotonesEvento from "../components/eventos/BotonesEvento";
import sportCiclismo from "../assets/sports/sport-ciclismo.png";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";
type RankingAthlete = {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  activities: number;
  distance: number;
  movingTime: number;
  elevationGain: number;
  distanceKm: number;
  hours: number;
  hasOverlap?: boolean;
  hasSpeedReview?: boolean;
  hasPendingVar?: boolean;
  hasPenalty?: boolean;
  penalty?: {
    rankingDistanceKm: number;
    appliedAt: string;
  } | null;
};

type ActivityHistoryItem = {
  id: string;
  externalId: string;
  source: string;
  type: string;
  name: string;
  distance: number;
  movingTime: number;
  elevationGain: number;
  averageSpeed: number | null;
  calories: number | null;
  startDate: string;
  distanceKm: number;
  endDate: string;
  hasOverlap?: boolean;
  hasSpeedReview?: boolean;
  overlappingActivityIds?: string[];
  pendingOverlapActivityIds?: string[];
  hasPendingVar?: boolean;
  isPenalized?: boolean;
  penalty?: {
    reason: string;
    rankingDistanceKm: number;
    appliedAt: string;
  } | null;
};

type Group = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  sport: string;
  joinCode: string;
  visibility: "PUBLIC" | "PRIVATE";
  administrator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  members: number;
};

const EVENT_SPORTS = ["Ciclismo", "Carrera", "Caminata", "Senderismo", "Natación", "Kayak", "Remo", "Vela", "Windsurf", "Silla de ruedas", "Triatlón"] as const;

const EVENT_SPORT_FIELDS: Record<string, { key: string; label: string; options: string[] }[]> = {
  Ciclismo: [
    { key: "terrain", label: "Terreno", options: ["Asfalto", "Tierra", "Mixto"] },
    { key: "pace", label: "Velocidad prevista", options: ["Recreativa", "Moderada", "Rápida"] },
  ],
  Carrera: [
    { key: "terrain", label: "Superficie", options: ["Asfalto", "Tierra", "Pista", "Mixto"] },
    { key: "pace", label: "Ritmo", options: ["Recreativo", "Moderado", "Intenso"] },
  ],
  Caminata: [
    { key: "terrain", label: "Tipo de recorrido", options: ["Urbano", "Rural", "Sendero", "Mixto"] },
  ],
  Senderismo: [
    { key: "terrain", label: "Tipo de sendero", options: ["Señalizado", "Montaña", "Bosque", "Mixto"] },
  ],
  "Natación": [
    { key: "water", label: "Entorno acuático", options: ["Pileta", "Río", "Lago", "Mar"] },
  ],
  Kayak: [
    { key: "water", label: "Tipo de agua", options: ["Río", "Lago", "Mar"] },
    { key: "current", label: "Corriente", options: ["Sin corriente", "Suave", "Moderada", "Fuerte"] },
  ],
  Remo: [
    { key: "water", label: "Tipo de agua", options: ["Río", "Lago", "Mar"] },
  ],
  Vela: [
    { key: "water", label: "Entorno", options: ["Río", "Lago", "Mar"] },
    { key: "wind", label: "Viento previsto", options: ["Suave", "Moderado", "Fuerte"] },
  ],
  Windsurf: [
    { key: "wind", label: "Viento previsto", options: ["Suave", "Moderado", "Fuerte"] },
    { key: "level", label: "Nivel recomendado", options: ["Inicial", "Intermedio", "Avanzado"] },
  ],
  "Silla de ruedas": [
    { key: "accessibility", label: "Accesibilidad", options: ["Accesible", "Con asistencia", "Exigente"] },
  ],
};
type GroupEvent = {
  details?: {
    sports?: string[];
    sportDetails?: Record<string, Record<string, string>>;
    routeDescription?: string;
    distance?: number | null;
    elevation?: number | null;
    surface?: string;
    difficulty?: string;
    bicycleTypes?: string[];
    food?: string[];
    foodTime?: string;
    foodTimes?: Record<string, string>;
    bringFood?: boolean;
    bringFoodOption?: "RECOMMENDED" | "NOT_PLANNED" | "OPTIONAL" | "";
    requiredEquipment?: string[];
    equipmentText?: string;
    disclaimer?: string;
  } | null;
  status?: string;
  publicationStatus?: "DRAFT" | "PUBLISHED";
  id: string;
  groupId: string;
  title: string;
  eventDate: string;
  departureTime: string;
  meetingPlace: string;
  destination?: string | null;
  estimatedReturn?: string | null;
  plannedSpeed?: string | null;
  rules?: string | null;
  weatherLatitude?: number | null;
  weatherLongitude?: number | null;
  organizer?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};
function EventTimeSelect({value,onChange}: {value:string;onChange:(value:string)=>void}) {
  const [hours, minutes] = value && /^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["", ""];
  const hourOptions = Array.from({length:24}, (_,i)=>String(i).padStart(2,"0"));
  const minuteOptions = Array.from({length:60}, (_,i)=>String(i).padStart(2,"0"));
  const style: React.CSSProperties = {flex:1,minWidth:0,padding:"9px 6px",borderRadius:8,border:"1px solid #2584c5",background:"#092c4b",color:"#fff",fontSize:14};
  return <div style={{display:"flex",gap:5,alignItems:"center"}}>
    <select aria-label="Hora" value={hours} onChange={e=>onChange(`${e.target.value}:${minutes || "00"}`)} style={style}>
      <option value="">Hora</option>{hourOptions.map(h=><option key={h} value={h}>{h}</option>)}
    </select><span style={{color:"#b9e5ff"}}>:</span>
    <select aria-label="Minutos" value={minutes} onChange={e=>onChange(`${hours || "00"}:${e.target.value}`)} style={style}>
      <option value="">Min.</option>{minuteOptions.map(m=><option key={m} value={m}>{m}</option>)}
    </select>
  </div>;
}

function EventCompactWeather({ event }: { event: GroupEvent }) {
  const [forecast, setForecast] = useState<EventWeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const lat = event.weatherLatitude;
    const lon = event.weatherLongitude;
    if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setForecast(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getEventWeatherForecast({ latitude: lat, longitude: lon }, event.eventDate.slice(0, 10), event.departureTime)
      .then(result => { if (!cancelled) setForecast(result); })
      .catch(() => { if (!cancelled) setForecast(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [event.id, event.weatherLatitude, event.weatherLongitude, event.eventDate, event.departureTime]);
  return <div style={{background:"#123e62",border:"1px solid #2879a9",borderRadius:8,padding:"4px 5px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minWidth:0,color:"#fff"}}>
    {forecast ? <>
      <EventWeatherIcon weatherCode={forecast.weatherCode} size={20}/>
      <div style={{minWidth:0,display:"grid",gap:4}}>
        <strong style={{fontSize:19,lineHeight:1.1}}>{Math.round(forecast.temperature)}°</strong>
        <span style={{fontSize:11,lineHeight:1.35}}>Lluvia {forecast.precipitationProbability}%</span>
        <span style={{fontSize:11,lineHeight:1.35}}>Viento {forecast.windSpeed} km/h</span>
      </div>
    </> : <span style={{fontSize:11,textAlign:"center"}}>{loading ? "Consultando clima..." : "Pronóstico no disponible"}</span>}
  </div>;
}

function ClimaProximaSalida({ event }: { event: GroupEvent }) {
  const [forecast, setForecast] = useState<EventWeatherForecast | null>(null);

  useEffect(() => {
    const lat = event.weatherLatitude;
    const lon = event.weatherLongitude;

    if (typeof lat !== "number" || typeof lon !== "number" ||
        !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setForecast(null);
      return;
    }

    let cancelled = false;
    setForecast(null);

    getEventWeatherForecast(
      { latitude: lat, longitude: lon },
      event.eventDate.slice(0, 10),
      event.departureTime
    ).then(result => {
      if (!cancelled) setForecast(result);
    }).catch(() => {
      if (!cancelled) setForecast(null);
    });

    return () => { cancelled = true; };
  }, [event.id, event.weatherLatitude, event.weatherLongitude,
      event.eventDate, event.departureTime]);

  const grados = forecast?.windDirection;
  const direcciones = ["Norte", "NE", "Este", "SE", "Sur", "SO", "Oeste", "NO"];
  const direccion = typeof grados === "number" && Number.isFinite(grados)
    ? direcciones[Math.round((((grados % 360) + 360) % 360) / 45) % 8]
    : null;

  return (
    <span style={{
      display:"inline-flex",
      alignItems:"center",
      justifyContent:"center",
      flexWrap:"wrap",
      gap:6,
      minWidth:0,
      color:"#e5f6ff",
      fontSize:10
    }}>
      {forecast ? (
        <>
          <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
            <EventWeatherIcon weatherCode={forecast.weatherCode} size={17}/>
            <strong style={{fontSize:12}}>
              {Math.round(forecast.temperature)}°C
            </strong>
          </span>
          <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
            <span style={{color:"#73d8ff",fontSize:16}}>≋</span>
            Viento {forecast.windSpeed} km/h
            {direccion ? ` (${direccion})` : ""}
          </span>
        </>
      ) : (
        <span style={{color:"#9dcbe8",fontSize:10}}>
          Pronóstico no disponible
        </span>
      )}
    </span>
  );
}
type Props = {
  group: Group;
  ranking: RankingAthlete[];
  loading: boolean;
  period: string;
  sexFilter: string;
  profilePicture?: string | null;
  activityHistory: ActivityHistoryItem[];
  activityHistoryLoading: boolean;
  activityHistoryAthlete: RankingAthlete | null;
  onPeriodChange: (period: string) => void;
  onSexFilterChange: (sex: string) => void;
  onBack: () => void;
  onOpenAthlete: (athlete: RankingAthlete) => void;
  canCreateEvents: boolean;
  isSuperAdmin: boolean;
  currentUserId: string | null;
  apiUrl: string;
  onUpdateGroupProfile: (
    groupId: string,
    profile: { description: string | null; imageUrl: string | null; coverImageUrl: string | null }
  ) => Promise<void>;  onUpdateGroupAdminPermission: (groupId: string, memberUserId: string, isGroupAdmin: boolean) => Promise<void>;
  canApplyPenalty: boolean;
  onApplyPenalty: (
    activityIds: string[],
    resolutionPairs: Array<{
      firstActivityId: string;
      secondActivityId: string;
    }>
  ) => Promise<unknown>;
  onCreateEvent: (
    groupId: string,
    eventData: {
      title: string;
      eventDate: string;
      departureTime: string;
      meetingPlace: string;
      destination: string;
      estimatedReturn: string;
      plannedSpeed: string;
      rules: string;
      weatherLatitude?: number | null;
      weatherLongitude?: number | null;
      details?: GroupEvent["details"];
      status?: string;
    }
  ) => Promise<unknown>;
};

import { useEffect, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import EventWeatherIcon from "../components/EventWeatherIcon";
import {
  getEventWeatherForecast,
  type EventWeatherForecast,
} from "../services/eventWeather";

export default function GroupPage({
  group,
  ranking,
  loading,
  period,
  sexFilter,
  profilePicture,
  activityHistory,
  activityHistoryLoading,
  activityHistoryAthlete,
  onPeriodChange,
  onSexFilterChange,
  onBack,
  onOpenAthlete,
  canCreateEvents,
  isSuperAdmin,
  currentUserId,
  apiUrl,
  onUpdateGroupProfile,
  onUpdateGroupAdminPermission,
  canApplyPenalty,
  onApplyPenalty,
  onCreateEvent,
}: Props) {
  const [selectedPenaltyActivities, setSelectedPenaltyActivities] = useState<string[]>([]);
  const [applyingPenalty, setApplyingPenalty] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState("");

  const [showGroupAdministration, setShowGroupAdministration] = useState(false);
  const [adminSection, setAdminSection] = useState<
    "profile" | "members" | "var" | "permissions" | "events" | "travel" | null
  >(null);
  const [administrationMembers, setAdministrationMembers] = useState<Array<{
    membershipId: string;
    isGroupAdmin: boolean;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>>([]);
  const [administrationLoading, setAdministrationLoading] = useState(false);
  const [administrationMessage, setAdministrationMessage] = useState("");
  const [updatingAdminId, setUpdatingAdminId] = useState<string | null>(null);

  const [profileDescription, setProfileDescription] = useState(group.description || "");
  const [profileImageUrl, setProfileImageUrl] = useState(group.imageUrl || "");
  const [profileCoverImageUrl, setProfileCoverImageUrl] = useState(group.coverImageUrl || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const isPrincipalAdministrator =
    currentUserId === group.administrator.id;

  const canManageGroup =
    isPrincipalAdministrator || isSuperAdmin;

  async function uploadGroupImage(dataUrl: string, kind: "cover" | "logo"): Promise<string> {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    const maxWidth = kind === "cover" ? 1600 : 600;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo comprimir la imagen")), "image/jpeg", 0.78);
    });
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${encodeURIComponent(group.id)}/images?kind=${kind}`, {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
      },
      body: blob,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo subir la imagen");
    if (!data.imageUrl) throw new Error("El servidor no devolvio la fotografia");
    return data.imageUrl;
  }

  async function saveGroupProfile() {
    if (!isPrincipalAdministrator || savingProfile) return;
    setSavingProfile(true);
    setProfileMessage("");
    try {
      let imageUrl = profileImageUrl.trim() || null;
      let coverImageUrl = profileCoverImageUrl.trim() || null;
      if (imageUrl?.startsWith("data:image/")) {
        setProfileMessage("Subiendo imagen pequeña...");
        imageUrl = await uploadGroupImage(imageUrl, "logo");
      }
      if (coverImageUrl?.startsWith("data:image/")) {
        setProfileMessage("Subiendo portada...");
        coverImageUrl = await uploadGroupImage(coverImageUrl, "cover");
      }
      setProfileMessage("Guardando perfil...");
      await onUpdateGroupProfile(group.id, {
        description: profileDescription.trim() || null,
        imageUrl,
        coverImageUrl,
      });
      setProfileImageUrl(imageUrl || "");
      setProfileCoverImageUrl(coverImageUrl || "");
      setProfileMessage("Perfil actualizado correctamente.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "No se pudo guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function loadAdministrationMembers() {
    if (!isPrincipalAdministrator) return;

    setAdministrationLoading(true);
    setAdministrationMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/api/groups/${encodeURIComponent(group.id)}/members`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("viarank_auth_token")}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los integrantes");
      }

      setAdministrationMembers(data.members || []);
    } catch (error) {
      setAdministrationMessage(
        error instanceof Error ? error.message : "Error cargando integrantes"
      );
    } finally {
      setAdministrationLoading(false);
    }
  }

  async function changeAdditionalAdministrator(
    memberUserId: string,
    isGroupAdmin: boolean
  ) {
    if (!isPrincipalAdministrator) return;

    setUpdatingAdminId(memberUserId);
    setAdministrationMessage("");

    try {
      await onUpdateGroupAdminPermission(group.id, memberUserId, isGroupAdmin);

      setAdministrationMembers((previous) =>
        previous.map((member) =>
          member.user.id === memberUserId
            ? { ...member, isGroupAdmin }
            : member
        )
      );
    } catch (error) {
      setAdministrationMessage(
        error instanceof Error ? error.message : "No se pudo cambiar el permiso"
      );
    } finally {
      setUpdatingAdminId(null);
    }
  }
  const [activeTab, setActiveTab] = useState<"ranking" | "events">("ranking");
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);
  const [modoParticipante, setModoParticipante] = useState(false); // VIARANK_VISTA_ATLETA_FINAL
  const [editingEvent, setEditingEvent] = useState<GroupEvent | null>(null);
  const [selectedEventWeather, setSelectedEventWeather] = useState<EventWeatherForecast | null>(null);
  const [selectedEventWeatherLoading, setSelectedEventWeatherLoading] = useState(false);
  const [selectedEventWeatherMessage, setSelectedEventWeatherMessage] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [eventValidation, setEventValidation] = useState("");
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSlide, setEventSlide] = useState(0);
  const [eventClock, setEventClock] = useState(() => Date.now());

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [destination, setDestination] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [plannedSpeed, setPlannedSpeed] = useState("");
  const [eventRules, setEventRules] = useState("");
  // VIARANK_EVENTOS_CAMPOS_V2 - campos visuales, aun no persistidos
  const [eventRouteDescription, setEventRouteDescription] = useState("");
  const [eventDistance, setEventDistance] = useState("");
  const [eventElevation, setEventElevation] = useState("");
  const [eventSurface, setEventSurface] = useState("");
  const [eventDifficulty, setEventDifficulty] = useState("");
  const [eventBicycleTypes, setEventBicycleTypes] = useState<string[]>([]);
  const [eventSports, setEventSports] = useState<string[]>([]);
  const [eventSportDetails, setEventSportDetails] = useState<Record<string, Record<string, string>>>({});
  const [eventFood, setEventFood] = useState<string[]>([]);
  const [eventFoodTimes, setEventFoodTimes] = useState<Record<string,string>>({});
  const [eventBringFoodOption, setEventBringFoodOption] = useState<"RECOMMENDED" | "NOT_PLANNED" | "OPTIONAL" | "">("");
  const [eventEquipmentText, setEventEquipmentText] = useState("Casco, luz delantera, luz trasera, cámara de repuesto, kit para pinchaduras e inflador.");
  const [eventDisclaimer, setEventDisclaimer] = useState("La participación es voluntaria. Cada participante debe contar con el equipamiento adecuado, respetar las normas de tránsito y seguir las indicaciones del organizador. Al inscribirse en la salida, el participante declara haber leído y aceptado las condiciones, normas y recomendaciones establecidas por el organizador.");
  const [eventStatus, setEventStatus] = useState<"CONFIRMED" | "EVALUATING" | "SUSPENDED" | "">("");
  const [eventWeather, setEventWeather] = useState<EventWeatherForecast | null>(null);
  const [eventWeatherLoading, setEventWeatherLoading] = useState(false);
  const [eventWeatherMessage, setEventWeatherMessage] = useState("");

  const [eventWeatherCoordinates, setEventWeatherCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  async function requestEventWeatherLocation() {
    setEventWeatherLoading(true);
    setEventWeatherMessage("");

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 15000,
      });

      setEventWeatherCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setEventWeatherCoordinates(null);
      setEventWeatherMessage(
        "No se pudo obtener la ubicación. Revisá los permisos del dispositivo."
      );
    } finally {
      setEventWeatherLoading(false);
    }
  }
  const [eventTemplates, setEventTemplates] = useState<Array<{
    id: string;
    title: string;
    meetingPlace: string | null;
    destination: string | null;
    departureTime: string | null;
    estimatedReturn: string | null;
    plannedSpeed: string | null;
    rules: string | null;
  }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    if (!showEventForm) return;

    void requestEventWeatherLocation();
  }, [showEventForm]);

  useEffect(() => {
    if (!showEventForm || !eventWeatherCoordinates || !eventDate || !departureTime) {
      setEventWeather(null);
      return;
    }

    let cancelled = false;

    async function loadEventWeather() {
      setEventWeatherLoading(true);
      setEventWeatherMessage("");
      setEventWeather(null);

      try {
        const forecast = await getEventWeatherForecast(
          eventWeatherCoordinates!,
          eventDate,
          departureTime
        );

        if (cancelled) return;

        setEventWeather(forecast);

        if (!forecast) {
          setEventWeatherMessage("Pronóstico todavía no disponible para esa fecha.");
        }
      } catch {
        if (!cancelled) {
          setEventWeatherMessage("No se pudo consultar el pronóstico.");
        }
      } finally {
        if (!cancelled) {
          setEventWeatherLoading(false);
        }
      }
    }

    void loadEventWeather();

    return () => {
      cancelled = true;
    };
  }, [showEventForm, eventWeatherCoordinates, eventDate, departureTime]);
  // Pronostico actualizado al abrir el evento.
  // Se usa la ubicacion guardada por el organizador, nunca la del atleta.
  useEffect(() => {
    if (!selectedEvent) {
      setSelectedEventWeather(null);
      setSelectedEventWeatherLoading(false);
      setSelectedEventWeatherMessage("");
      return;
    }

    const latitude = selectedEvent.weatherLatitude;
    const longitude = selectedEvent.weatherLongitude;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setSelectedEventWeather(null);
      setSelectedEventWeatherLoading(false);
      setSelectedEventWeatherMessage(
        "Este evento no tiene una ubicacion meteorologica registrada."
      );
      return;
    }

    let cancelled = false;

    async function loadSelectedEventWeather() {
      setSelectedEventWeatherLoading(true);
      setSelectedEventWeather(null);
      setSelectedEventWeatherMessage("");

      try {
        const forecast = await getEventWeatherForecast(
          { latitude: latitude!, longitude: longitude! },
          selectedEvent!.eventDate.slice(0, 10),
          selectedEvent!.departureTime
        );

        if (!cancelled) {
          setSelectedEventWeather(forecast);
          if (!forecast) {
            setSelectedEventWeatherMessage(
              "El pronostico aun no esta disponible para esta fecha."
            );
          }
        }
      } catch {
        if (!cancelled) {
          setSelectedEventWeatherMessage(
            "No se pudo consultar el pronostico en este momento."
          );
        }
      } finally {
        if (!cancelled) {
          setSelectedEventWeatherLoading(false);
        }
      }
    }

    void loadSelectedEventWeather();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);
  function togglePenaltyActivity(activityId: string) {
    setSelectedPenaltyActivities((current) =>
      current.includes(activityId)
        ? current.filter((id) => id !== activityId)
        : [...current, activityId]
    );
    setPenaltyMessage("");
  }

  async function handleApplyPenalty() {
    if (selectedPenaltyActivities.length < 1) {
      setPenaltyMessage("Seleccioná al menos una actividad superpuesta.");
      return;
    }

    const resolutionPairs: Array<{
      firstActivityId: string;
      secondActivityId: string;
    }> = [];

    for (const activityId of selectedPenaltyActivities) {
      const activity = activityHistory.find(
        (item) => item.id === activityId
      );

      const pendingPartners =
        activity?.pendingOverlapActivityIds ?? [];

      if (pendingPartners.length !== 1) {
        setPenaltyMessage(
          "Este caso VAR tiene más de una superposición pendiente y debe revisarse por separado."
        );
        return;
      }

      const pair = [activityId, pendingPartners[0]].sort();

      if (
        !resolutionPairs.some(
          (existingPair) =>
            existingPair.firstActivityId === pair[0] &&
            existingPair.secondActivityId === pair[1]
        )
      ) {
        resolutionPairs.push({
          firstActivityId: pair[0],
          secondActivityId: pair[1],
        });
      }
    }


    if (resolutionPairs.length !== 1) {
      setPenaltyMessage(
        "Seleccioná actividades pertenecientes a un solo caso VAR por vez."
      );
      return;
    }
    const confirmed = window.confirm(
      "¿Confirmás aplicar la penalización VAR? Las actividades seleccionadas computarán 0,01 km cada una únicamente en el ranking de este grupo."
    );

    if (!confirmed) return;

    try {
      setApplyingPenalty(true);
      setPenaltyMessage("");

      await onApplyPenalty(
        selectedPenaltyActivities,
        resolutionPairs
      );

      setSelectedPenaltyActivities([]);
      setPenaltyMessage("Penalización aplicada correctamente.");
    } catch (error) {
      setPenaltyMessage(
        error instanceof Error
          ? error.message
          : "No se pudo aplicar la penalización."
      );
    } finally {
      setApplyingPenalty(false);
    }
  }

  async function saveEventTemplate() {
    const faltantesPlantilla = [
      !eventTitle.trim() && "título",
      !departureTime && "hora de salida",
      !meetingPlace.trim() && "lugar de encuentro",
      !destination.trim() && "destino",
    ].filter(Boolean);

    if (faltantesPlantilla.length) {
      setEventValidation(`Para generar la plantilla faltan datos obligatorios: ${faltantesPlantilla.join(", ")}.`);
      return;
    }

    setEventValidation("");

    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      setEventValidation("Iniciá sesión para guardar una salida habitual.");
      return;
    }

    try {
      setTemplatesLoading(true);
      setEventMessage("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/${group.id}/event-templates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: eventTitle,
            meetingPlace,
            destination,
            departureTime,
            estimatedReturn,
            plannedSpeed,
            rules: eventRules,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar la salida habitual.");
      }

      await fetchEventTemplates();
      setEventValidation("");
      setEventMessage("Salida habitual guardada correctamente.");
    } catch (error) {
      setEventMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la salida habitual."
      );
    } finally {
      setTemplatesLoading(false);
    }
  }
  async function loadEventTemplates() {
    setTemplatesLoading(true);
    try {
      await fetchEventTemplates();
    } catch (error) {
      console.error("Error cargando salidas guardadas:", error);
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function fetchEventTemplates() {
    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      throw new Error("Iniciá sesión para consultar las salidas guardadas.");
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/groups/${group.id}/event-templates`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar las salidas guardadas.");
    }

    setEventTemplates(data.templates || []);
  }
  function startCreatingEvent() {
    if (!canCreateEvents || savingEvent) return;
    setEditingEvent(null);
      setSelectedEvent(null);
      setModoParticipante(false);
      setEventTitle("");
      setEventDate("");
      setDepartureTime("");
      setMeetingPlace("");
      setDestination("");
      setEstimatedReturn("");
      setPlannedSpeed("");
      setEventRules("");
      setEventStatus("");
      setEventRouteDescription("");
      setEventDistance("");
      setEventElevation("");
      setEventSurface("");
      setEventDifficulty("");
      setEventBicycleTypes([]);
      setEventSports([]);
      setEventSportDetails({});
      setEventFood([]);
      setEventFoodTimes({});
      setEventBringFoodOption("");
      setEventEquipmentText("");
      setEventDisclaimer("");
      setEventWeatherCoordinates(null);
      setEventValidation("");
      setEventMessage("");
      setShowEventForm(true);
  }
  function startEditingEvent(event: GroupEvent) {
    if (!canCreateEvents) return;
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDate(event.eventDate.slice(0, 10));
    setDepartureTime(event.departureTime);
    setMeetingPlace(event.meetingPlace);
    setDestination(event.destination || "");
    setEstimatedReturn(event.estimatedReturn || "");
    setPlannedSpeed(event.plannedSpeed || "");
    setEventRules(event.rules || "");
    setEventStatus(event.status === "CONFIRMED" || event.status === "EVALUATING" || event.status === "SUSPENDED" ? event.status : "CONFIRMED");
    setEventRouteDescription(event.details?.routeDescription || "");
    setEventDistance(event.details?.distance == null ? "" : String(event.details.distance));
    setEventElevation(event.details?.elevation == null ? "" : String(event.details.elevation));
    setEventSurface(event.details?.surface || "");
    setEventDifficulty(event.details?.difficulty || "");
    setEventBicycleTypes(event.details?.bicycleTypes || []);
    setEventSports(
      event.details?.sports?.length
        ? event.details.sports
        : group?.sport && EVENT_SPORTS.some(s => s === group.sport)
          ? [group.sport]
          : []
    );
    setEventSportDetails(event.details?.sportDetails || {});
    setEventFood(event.details?.food || []);
    setEventFoodTimes(event.details?.foodTimes || {});
    setEventBringFoodOption(event.details?.bringFoodOption || (event.details?.bringFood ? "OPTIONAL" : ""));
    setEventEquipmentText(event.details?.equipmentText || "");
    setEventDisclaimer(event.details?.disclaimer || "");
    setEventWeatherCoordinates(event.weatherLatitude != null && event.weatherLongitude != null ? {latitude:event.weatherLatitude,longitude:event.weatherLongitude} : null);
    setEventValidation("");
    setSelectedEvent(null);
    setShowEventForm(true);
  }

  async function saveEventWithPublication(mode: "DRAFT" | "PUBLISHED" | "WHATSAPP") {
    if (savingEvent) return;
    const faltantes = [
      !eventTitle.trim() && "título",
      !eventDate && "fecha",
      !departureTime && "hora",
      !meetingPlace.trim() && "lugar de encuentro",
      !destination.trim() && "destino",
      !eventStatus && "estado del evento",
    ].filter(Boolean);
    if (faltantes.length) {
      setEventValidation(`Faltan datos obligatorios: ${faltantes.join(", ")}.`);
      return;
    }
    setEventValidation("");
    const alreadyPublished = editingEvent?.publicationStatus === "PUBLISHED";
    if (alreadyPublished && mode !== "PUBLISHED") {
      setEventValidation("Un evento publicado no puede volver a borrador. Para cambiar la salida, suspendé el original y creá uno nuevo.");
      return;
    }
    // Abrir durante el clic evita que el navegador bloquee la ventana tras la espera de red.
    const whatsappWindow = mode === "WHATSAPP" ? window.open("about:blank", "_blank") : null;
    let savedEvent: GroupEvent | null = null;
    let eventWasSaved = false;
    try {
      setSavingEvent(true);
      setEventMessage("");
      const eventPayload = {
        title: eventTitle, eventDate, departureTime, meetingPlace, destination,
        estimatedReturn, plannedSpeed, rules: eventRules,
        details: {
          sports: eventSports,
          sportDetails: eventSportDetails,
          routeDescription: eventRouteDescription.trim(),
          distance: eventDistance.trim() ? Number(eventDistance) : null,
          elevation: eventElevation.trim() ? Number(eventElevation) : null,
          surface: eventSurface, difficulty: eventDifficulty,
          bicycleTypes: eventBicycleTypes, food: eventFood, foodTimes: eventFoodTimes,
          bringFood: eventBringFoodOption === "OPTIONAL" || eventBringFoodOption === "RECOMMENDED",
          bringFoodOption: eventBringFoodOption,
          equipmentText: eventEquipmentText, disclaimer: eventDisclaimer,
        },
        status: eventStatus,
        weatherLatitude: eventWeatherCoordinates?.latitude ?? null,
        weatherLongitude: eventWeatherCoordinates?.longitude ?? null,
      };
      if (editingEvent) {
        const response = await fetch(`${apiUrl}/api/groups/${encodeURIComponent(group.id)}/events/${encodeURIComponent(editingEvent.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}` },
          body: JSON.stringify(eventPayload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo editar el evento.");
        savedEvent = result.event as GroupEvent;
      } else {
        savedEvent = await onCreateEvent(group.id, eventPayload) as GroupEvent | null;
      }
      if (!savedEvent?.id) throw new Error("El servidor no devolvió el identificador del evento.");
      eventWasSaved = true;
      // Si la publicación falla, el siguiente intento editará el evento ya creado, sin duplicarlo.
      setEditingEvent(savedEvent);
      const targetPublication = alreadyPublished || mode !== "DRAFT" ? "PUBLISHED" : "DRAFT";
      if (savedEvent.publicationStatus !== targetPublication) {
        const response = await fetch(`${apiUrl}/api/groups/${encodeURIComponent(group.id)}/events/${encodeURIComponent(savedEvent.id)}/publication`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}` },
          body: JSON.stringify({ publicationStatus: targetPublication }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "El evento se guardó, pero no se pudo cambiar su publicación.");
      }
      if (mode === "WHATSAPP") {
        const fecha = new Date(`${eventDate}T12:00:00`).toLocaleDateString("es-AR");
        const mensaje = [
          `\u{1F6B4} ViaRank - ${group.name}`,
          eventTitle,
          `\u{1F4C5} ${fecha} - ${departureTime}`,
          `\u{1F4CD} Encuentro: ${meetingPlace}`,
          ...(destination ? [`\u{1F3C1} Destino: ${destination}`] : []),
          "",
          "Abrí ViaRank para consultar el evento y sumarte a la salida:",
          "https://viarank-1.onrender.com/"
        ].join("\n");
const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = url;
        else window.open(url, "_blank", "noopener,noreferrer");
      }
      setEventMessage(alreadyPublished ? "Correcciones guardadas. El evento sigue publicado." : targetPublication === "DRAFT" ? "Borrador guardado correctamente." : "Evento publicado en ViaRank correctamente.");
      setShowEventForm(false);
      setEditingEvent(null);
      await loadEvents();
      setEventTitle(""); setEventDate(""); setDepartureTime("");
      setMeetingPlace(""); setDestination(""); setEstimatedReturn("");
      setPlannedSpeed(""); setEventRules("");
    } catch (error) {
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      setEventMessage(`${eventWasSaved ? "El evento se guardó, pero hubo un problema: " : ""}${error instanceof Error ? error.message : "No se pudo guardar el evento."}`);
    } finally {
      setSavingEvent(false);
    }
  }
  async function changeEventPublication(event: GroupEvent) {
    if (!canCreateEvents || event.publicationStatus === "PUBLISHED") return;
    if (!window.confirm("¿Publicar este evento en ViaRank? Los atletas podrán verlo.")) return;
    try {
      const response = await fetch(`${apiUrl}/api/groups/${encodeURIComponent(group.id)}/events/${encodeURIComponent(event.id)}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}` },
        body: JSON.stringify({ publicationStatus: "PUBLISHED" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo publicar el evento.");
      await loadEvents();
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : "No se pudo publicar el evento.");
    }
  }

  async function deleteGroupEvent(event: GroupEvent) {
    if (!canCreateEvents || !window.confirm(`¿Eliminar definitivamente «${event.title}»? Esta acción no se puede deshacer.`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/groups/${encodeURIComponent(group.id)}/events/${encodeURIComponent(event.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "No se pudo eliminar el evento.");
      }
      await loadEvents();
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : "No se pudo eliminar el evento.");
    }
  }

  async function loadEvents() {
    try {
      setEventsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/groups/${group.id}/events`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}` } }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los eventos");
      }

      const eventosActualizados: GroupEvent[] = data.events || [];
      setEvents(eventosActualizados);
      setSelectedEvent(actual =>
        actual
          ? eventosActualizados.find(evento => evento.id === actual.id) || null
          : null
      );
    } catch (error) {
      setEventMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los eventos."
      );
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    void loadEventTemplates();
  }, [group.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setEventClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingEvents = events
    .filter((event) => {
      const fechaArgentina = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(event.eventDate));
      const vencimiento = new Date(`${fechaArgentina}T23:59:59-03:00`);
      return vencimiento.getTime() >= eventClock;
    })
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.departureTime.localeCompare(b.departureTime));



  const upcomingEvent =
    upcomingEvents.length > 0
      ? upcomingEvents[eventSlide % upcomingEvents.length]
      : undefined;
  const periodLabel =
    period === "week"
      ? "Semana"
      : period === "month"
        ? "Mes"
        : period === "year"
          ? "Año"
          : "Total";

  const eventInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "4px 8px",
    borderRadius: "7px",
    border: "1px solid #4ca7dd",
    background: "linear-gradient(110deg, #d9f4ff, #a6dcf8)",
    color: "#061B30",
    fontSize: "17px", fontWeight: 700,
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(255,255,255,.85), 0 0 8px rgba(31,164,255,.12)",
  };
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 0%, #1b507e 0%, #10385d 42%, #071d35 100%)",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  };

  const card: React.CSSProperties = {
    background: "linear-gradient(145deg, #102e4d, #09233e)",
    border: "1px solid #1b527e",
    borderRadius: "15px",
    boxShadow: "0 8px 20px rgba(0,0,0,.22)",
  };

  return (
    <div style={shell}>
      <div
        style={{
          width: "min(100%, 515px)",
          minHeight: "100vh",
          margin: "0 auto",
          padding: "18px 14px 90px",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "42px 1fr 42px",
            alignItems: "center",
            marginBottom: activeTab === "events" ? "0px" : "18px",
          }}
        >
          <button
            onClick={() => activeTab === "events" ? setActiveTab("ranking") : onBack()}
            aria-label="Volver"
            style={{
              border: 0,
              background: "transparent",
              color: "#fff",
              fontSize: "31px",
              cursor: "pointer",
            }}
          >
            ‹
          </button>

          <img
            src={viarankHeaderLogo}
            alt="ViaRank"
            style={{
              width: "120px",
              height: "38px",
              objectFit: "contain",
              display: "block",
              justifySelf: "center",
            }}
          />

          <div
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              justifySelf: "end",
            }}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt=""
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #188cff",
                }}
              />
            ) : (
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "#173d61",
                  border: "2px solid #188cff",
                }}
              />
            )}
            <span
              style={{
                position: "absolute",
                right: "-1px",
                bottom: "1px",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "#19df66",
                border: "2px solid #071b31",
              }}
            />
          </div>
          {activeTab === "events" && (
            <div style={{
              gridColumn: "1 / -1",
              gridRow: "2",
              marginTop: "3px",
              marginBottom: "5px"
            }}>
              <div style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.2
              }}>
                Eventos
              </div>
              <div style={{
                fontSize: "12px",
                color: "#a9cbea",
                marginTop: "3px"
              }}>
                Próximas salidas organizadas por el grupo.
              </div>
            </div>
          )}
        </header>

        {activeTab === "ranking" && (
          <>
        <section
          style={{
            ...card,
            padding: "10px 12px",
            marginBottom: "12px",
            border: "1px solid #168cff",
            background: "linear-gradient(145deg, #103353, #09233e)",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <div style={{
              width: "65px",
              height: "65px",
              flexShrink: 0,
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid #286b9e",
            }}>
              <img
                src={group.imageUrl || sportCiclismo}
                alt="Imagen del grupo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontSize: "19px",
                lineHeight: 1.2,
                fontWeight: 750,
              }}>
                {group.name}
              </h1>

              {group.description && (
                <p style={{
                  margin: "5px 0 0",
                  fontSize: "12px",
                  lineHeight: 1.4,
                  color: "#c5e6f7",
                }}>
                  {group.description}
                </p>
              )}

              <div style={{
                marginTop: "4px",
                color: "#b5d3e8",
                fontSize: "12px",
              }}>
                Administrador: {group.administrator.firstName}{" "}
                {group.administrator.lastName}
              </div>

              <div style={{
                marginTop: "3px",
                color: "#77caff",
                fontSize: "12px",
              }}>
                {group.visibility === "PUBLIC"
                  ? "Grupo público"
                  : "Grupo privado"}
              </div>

              {canApplyPenalty && group.joinCode && (
                <button
                  type="button"
                  title="Copiar código del grupo"
                  onClick={() => {
                    navigator.clipboard.writeText(group.joinCode)
                      .then(() => window.alert("Código copiado"))
                      .catch(() => window.prompt("Copiá el código:", group.joinCode));
                  }}
                  style={{
                    marginTop: "3px",
                    padding: "1px 4px",
                    border: "1px solid #285778",
                    borderRadius: "4px",
                    background: "transparent",
                    color: "#9ac9e5",
                    fontSize: "9px",
                    cursor: "pointer",
                  }}
                >
                  Código: {group.joinCode} ⧉
                </button>
              )}
            </div>

            <div style={{
              flexShrink: 0,
              textAlign: "center",
              minWidth: "42px",
            }}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="#38bdf8"
                style={{ display: "block", margin: "0 auto" }}
              >
                <circle cx="12" cy="7" r="3" />
                <circle cx="5.5" cy="9" r="2.4" />
                <circle cx="18.5" cy="9" r="2.4" />
                <path d="M7 18c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5v1H7v-1Z" />
                <path d="M1.5 18c0-2.7 1.7-4.6 4-4.6 1 0 1.9.4 2.6 1-1.1 1.2-1.7 4.6H1.5v-1Z" />
                <path d="M22.5 18c0-2.7-1.7-4.6-4-4.6-1 0-1.9.4-2.6 1 1.1 1.2 1.7 2.8 1.7 4.6h4.9v-1Z" />
              </svg>
              <strong style={{
                display: "block",
                marginTop: "3px",
                fontSize: "16px",
              }}>
                {group.members}
              </strong>
              <div style={{
                color: "#8eabc3",
                fontSize: "9px",
              }}>
                atletas
              </div>
            </div>
          </div>
        </section>
        {canManageGroup && (
          <div style={{
            display: "flex",
            justifyContent: "stretch",
            marginBottom: "12px",
          }}>
            <button
              type="button"
              onClick={() => {
                const next = !showGroupAdministration;
                setShowGroupAdministration(next);
                if (next) void loadAdministrationMembers();
              }}
              style={{
                display: "block",
                width: "100%",
                minHeight: "24px",
                padding: "4px 10px",
                borderRadius: "8px",
                border: "1px solid #35baff",
                background: "linear-gradient(180deg, #208fd0, #12649b 55%, #08426f)",
                boxShadow: "inset 0 2px 2px rgba(255,255,255,0.24), 0 4px 0 #062b4a, 0 6px 12px rgba(0,0,0,0.3)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              {showGroupAdministration
                ? "Cerrar administración"
                : "Administrar grupo"}
            </button>
          </div>
        )}
        {showGroupAdministration && canManageGroup && (
          <section style={{
            padding: "12px",
            marginBottom: "14px",
            borderRadius: "12px",
            border: "1px solid #168cff",
            background: "#0b2946",
          }}>
            <h3 style={{
              margin: "0 0 12px",
              color: "#ffffff",
              fontSize: "15px",
            }}>
              Administrar grupo
            </h3>

            {([
              ["events", "＋", "Crear y editar evento"],
              ["members", "♙", "Administrar atletas"],
              ["var", "⚑", "Control de actividad (VAR)"],
              ["permissions", "♧", "Administradores y colaboradores"],
              ["profile", "▧", "Perfil del grupo"],
              ["travel", "✈", "ViaRank Viajes"],
            ] as const).map(([section, symbol, label]) => (
              <button
                key={section}
                type="button"
                onClick={() => {
                  if (section === "events") {
                    setShowGroupAdministration(false);
                    setAdminSection(null);
                    startCreatingEvent();
                    setActiveTab("events");
                  } else {
                    setAdminSection(
                      adminSection === section ? null : section
                    );
                  }
                }}
                style={{
                  width: "100%",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "7px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: section === "travel"
                    ? "1px solid #42b9e8"
                    : "1px solid #286c9d",
                  background: adminSection === section
                    ? "#176093"
                    : "#123c61",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{
                  width: "18px",
                  color: section === "travel" ? "#f5c46b" : "#8dd8ff",
                  fontSize: "15px",
                  textAlign: "center",
                }}>
                  {symbol}
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                <span style={{ color: "#8dd8ff" }}>›</span>
              </button>
            ))}

            {adminSection === "events" && (
              <p style={{ color: "#c5e6f7", fontSize: "12px" }}>
                Gestión de eventos del grupo.
              </p>
            )}

            {adminSection === "members" && (
              <p style={{ color: "#c5e6f7", fontSize: "12px" }}>
                Administración de los atletas del grupo.
              </p>
            )}

            {adminSection === "var" && (
              <p style={{ color: "#c5e6f7", fontSize: "12px" }}>
                Control de velocidad, tiempo y recorridos superpuestos.
              </p>
            )}

            {adminSection === "permissions" && (
              <p style={{ color: "#c5e6f7", fontSize: "12px" }}>
                Administradores adicionales y colaboradores.
              </p>
            )}

            {adminSection === "profile" && (
  <div style={{
    padding: 14,
    marginTop: 10,
    borderRadius: 12,
    background: "#103758",
    border: "1px solid #2584c5"
  }}>
    <h3 style={{margin:"0 0 12px",fontSize:16,color:"#fff"}}>
      Perfil del grupo
    </h3>

    <div style={{display:"grid",gap:12,marginBottom:16}}>
<div>
        <label style={{display:"block",color:"#bceaff",marginBottom:6}}>Logo o imagen del grupo</label>
        <img src={profileImageUrl || sportCiclismo} alt="Vista previa de imagen pequeña" style={{width:85,height:85,objectFit:"cover",borderRadius:12,border:"2px solid #54c4ff",marginBottom:8}} />
        <label style={{display:"block",padding:12,textAlign:"center",borderRadius:10,background:"#1678bb",color:"#fff",fontWeight:800,cursor:"pointer"}}>
          Cambiar logo o imagen
          <input type="file" accept="image/*" disabled={!isPrincipalAdministrator} style={{display:"none"}} onChange={(e)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string"){setProfileImageUrl(reader.result);setProfileMessage("Imagen pequeña seleccionada. Aún no fue guardada.");}};reader.readAsDataURL(file);}} />
        </label>
      </div>
    </div>
    <label style={{display:"block",color:"#bceaff",marginBottom:6}}>Descripción del grupo</label>
    <textarea
      value={profileDescription}
      onChange={(e) => setProfileDescription(e.target.value)}
      disabled={!isPrincipalAdministrator}
      rows={3}
      style={{
        width:"100%",
        boxSizing:"border-box",
        padding:10,
        borderRadius:8,
        border:"1px solid #329de1",
        background:"#d9f2ff",
        color:"#102d45",
        marginBottom:12
      }}
    />

    <button
      type="button"
      onClick={() => void saveGroupProfile()}
      disabled={!isPrincipalAdministrator || savingProfile}
      style={{
        width:"100%",
        padding:"9px 12px",
        borderRadius:9,
        border:"1px solid #45c5ff",
        background:"linear-gradient(180deg,#238ee0,#07548d)",
        color:"#fff",
        fontWeight:800,
        cursor:"pointer"
      }}
    >
      {savingProfile ? "Guardando..." : "Guardar perfil"}
    </button>

    {profileMessage && (
      <p style={{color:"#bceaff",fontSize:12}}>
        {profileMessage}
      </p>
    )}
  </div>
)}

            {adminSection === "travel" && (
              <p style={{ color: "#c5e6f7", fontSize: "12px" }}>
                ViaRank Viajes: servicio sujeto a autorización.
              </p>
            )}
          </section>
        )}        <div style={{ marginBottom: "12px", display: adminSection === "profile" ? "none" : undefined }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 11px",
            marginBottom: "9px",
            border: "1px solid #168cff",
            borderRadius: "9px",
            background: "#0b2946",
            color: "#e5f6ff",
            fontSize: "12px",
            fontWeight: 800,
          }}>
            <style>{`
  /* VIA RANK - LEGIBILIDAD CAMPOS EVENTOS */
.viarank-event-form-luminous input:not([type="checkbox"]):not([type="radio"]),
.viarank-event-form-luminous select,
.viarank-event-form-luminous textarea {
  color: #061B30 !important;
  font-size: 17px !important;
  font-weight: 700 !important;
}

.viarank-event-form-luminous input::placeholder,
.viarank-event-form-luminous textarea::placeholder {
  color: #173C57 !important;
  opacity: 1 !important;
  font-size: 17px !important;
  font-weight: 700 !important;
}
  /* VIA RANK - PLACEHOLDERS OSCUROS */
  .viarank-event-form-luminous input::placeholder,
  .viarank-event-form-luminous textarea::placeholder,
  .viarank-event-form-luminous input::-webkit-input-placeholder,
  .viarank-event-form-luminous textarea::-webkit-input-placeholder {
    color: #061B30 !important;
    -webkit-text-fill-color: #061B30 !important;
    opacity: 1 !important;
    font-size: 17px !important;
    font-weight: 700 !important;
  }
`}</style>
<span>Próximas salidas</span>
            
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
          {upcomingEvents.length > 0 ? upcomingEvents.map((upcomingEvent) => (
            <div key={upcomingEvent.id} style={{
              border: "1px solid #25b9ff",
              borderRadius: "12px",
              padding: "11px",
              background: "linear-gradient(135deg, #103657, #061a30)",
              boxShadow: "0 0 10px rgba(20,140,255,.20)",
            }}>
              <div style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}>
                <img
                  src={group.imageUrl || sportCiclismo}
                  alt=""
                  style={{
                    width: "75px",
                    height: "92px",
                    objectFit: "cover",
                    borderRadius: "9px",
                    flexShrink: 0,
                    border: "1px solid #286c9a",
                  }}
                />

                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: "grid",
                  gap: "5px",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                    width: "100%",
                  }}>
                    <strong style={{
                      color: "#fff",
                      fontSize: "17px",
                      fontWeight: 800,
                    }}>
                      Evento
                    </strong>
</div>
<div style={{display:"flex",justifyContent:"flex-start",minWidth:0}}>
  <EstadoEvento
    status={upcomingEvent.status}
    style={{padding:"3px 6px",fontSize:10}}
  />
                  </div>

                  <div style={{
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 700,
                    overflowWrap: "anywhere",
                  }}>
                    📍 Destino: {upcomingEvent.destination || "A definir"}
                  </div>

                  <div style={{
                    color: "#d7edff",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}>
                    📅 {new Date(upcomingEvent.eventDate).toLocaleDateString("es-AR")}
                    {" · "}
                    {upcomingEvent.departureTime}
                  </div>

                  {upcomingEvent.organizer && (
                    <div style={{
                      color: "#d7edff",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}>
                      👤 Organiza: {`${upcomingEvent.organizer.firstName || ""} ${upcomingEvent.organizer.lastName || ""}`.trim()}
                    </div>
                  )}

                  
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModoParticipante(true);
                  setSelectedEvent(upcomingEvent);
                  setShowEventForm(false);
                  setActiveTab("events");
                }}
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: "24px",
                  padding: "4px 10px",
                  marginTop: "11px",
                  borderRadius: "8px",
                  border: "1px solid #6dffa1",
                  background: "linear-gradient(180deg,#20d66d,#07853d)",
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,.32), 0 2px 0 #045a29",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Ver evento y sumarme
              </button>
            </div>          )) : (
            <div style={{
              padding: "8px 12px",
              borderRadius: "9px",
              background: "#0a2a46",
              border: "1px solid #245b83",
              color: "#9fc9e8",
              fontSize: "11px",
              textAlign: "center",
            }}>
              No hay eventos disponibles para este grupo
            </div>
          )}
          </div>
        </div>

        <style>{`
          @keyframes viarankEventGlow {
            0%, 80%, 100% {
              box-shadow: 0 0 0 rgba(41,186,255,0);
            }
            87% {
              box-shadow: 0 0 7px rgba(41,186,255,.65);
            }
          }
          .viarank-event-join {
            animation: viarankEventGlow 3s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .viarank-event-join {
              animation: none;
            }
          }
        `}</style>
          </>
        )}
        {activeTab === "ranking" && !showGroupAdministration ? (
          <section>
<style>{`
  .viarank-event-actions button {
    min-height: 28px !important;
    padding: 4px 5px !important;
    border-radius: 7px !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    line-height: 1.1 !important;
    box-shadow: inset 0 1px 1px rgba(255,255,255,.35), 0 2px 5px rgba(0,0,0,.3) !important;
  }
  .viarank-event-actions button:nth-child(1):not(:disabled) {
    background: linear-gradient(#168ef5,#0754a8) !important;
    border: 1px solid #42baff !important;
    color: white !important;
  }
  .viarank-event-actions button:nth-child(2):not(:disabled) {
    background: linear-gradient(#20d66d,#07853d) !important;
    border: 1px solid #6dffa1 !important;
    color: white !important;
  }
  .viarank-event-actions button:nth-child(3) {
    background: linear-gradient(#24b4ef,#08649d) !important;
    border: 1px solid #62d5ff !important;
    color: white !important;
  }
  .viarank-event-actions button:nth-child(4) {
    background: linear-gradient(#f34d55,#a71932) !important;
    border: 1px solid #ff8389 !important;
    color: white !important;
  }
  .viarank-event-actions button:disabled {
    opacity: .48 !important;
    cursor: not-allowed !important;
  }
`}</style>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ height: "1px", flex: 1, background: "#2da7e8" }} />
            <h2 style={{ margin: 0, fontSize: "18px", letterSpacing: "2px", color: "#a9ddff" }}>
              RANKING
            </h2>
            <div style={{ height: "1px", flex: 1, background: "#2da7e8" }} />
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            marginBottom: "7px",
          }}>
            <select
              aria-label="Categoría del ranking"
              value={sexFilter}
              onChange={(e) => onSexFilterChange(e.target.value)}
              style={{
                background: "#0b2946",
                color: "#e5f6ff",
                border: "1px solid #3b9dd5",
                borderRadius: "9px",
                padding: "2px 9px",
                fontSize: "12px",
                fontWeight: 700,
                width: "34%",
              }}
            >
              <option value="">General</option>
              <option value="FEMALE">Femenino</option>
              <option value="MALE">Masculino</option>
            </select>

            <select
              aria-label="Período del ranking"
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              style={{
                background: "#0b2946",
                color: "#e5f6ff",
                border: "1px solid #3b9dd5",
                borderRadius: "9px",
                padding: "2px 9px",
                fontSize: "12px",
                fontWeight: 700,
                width: "34%",
              }}
            >
              <option value="week">Semana en curso</option>
              <option value="month">Mes en curso</option>
              <option value="year">Año en curso</option>
              <option value="total">Total</option>
            </select>
          </div>
          {loading ? (
            <div style={{ ...card, padding: "18px" }}>Cargando ranking...</div>
          ) : ranking.length === 0 ? (
            <div style={{ ...card, padding: "18px", color: "#9db6ce" }}>
              Todavía no hay actividades para este período.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "5px" }}>
              {ranking.map((athlete) => {
                const isOpen =
                  activityHistoryAthlete?.userId === athlete.userId;

                return (
                  <div
                    key={athlete.userId}
                    style={{
                      ...card,
                      border: "1px solid #1c527c",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => onOpenAthlete(athlete)}
                      style={{
                        width: "100%",
                        border: 0,
                        background: "transparent",
                        padding: "2px 9px",
                        display: "grid",
                        gridTemplateColumns: "26px 36px 1fr auto 18px",
                        gap: "6px",
                        alignItems: "center",
                        color: "#fff",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ textAlign: "center", fontSize: "16px" }}>
                        {athlete.position === 1 ? "🥇" : athlete.position === 2 ? "🥈" : athlete.position === 3 ? "🥉" : athlete.position}
                      </strong>

                      {athlete.profilePicture ? (
                        <img
                          src={athlete.profilePicture}
                          alt=""
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #2878b7",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: "#173d61",
                            border: "2px solid #2878b7",
                          }}
                        />
                      )}

                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: "13px" }}>
                          {athlete.firstName} {athlete.lastName}
                        </strong>

                        {(athlete.hasOverlap || athlete.hasSpeedReview) && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              marginLeft: "7px",
                            }}
                          >
                            <span
                              title={
                                 athlete.hasOverlap && athlete.hasSpeedReview
                                   ? "Posible superposición y alerta de velocidad"
                                   : athlete.hasSpeedReview
                                     ? "Actividad pendiente de revisión por velocidad"
                                     : "Posible superposición de actividades"
                               }
                              style={{
                                display: "inline-flex",
                                width: "15px",
                                height: "9px",
                                borderRadius: "2px",
                                background: "#ffff00",
                                border: "1px solid #e1c900",
                                flexShrink: 0,
                              }}
                            />

                            {athlete.hasPendingVar && (
                              <strong
                                style={{
                                  color: "#ff3434",
                                  fontSize: "10px",
                                  animation: "viarankVarBlink 1s infinite",
                                }}
                              >
                                VAR
                              </strong>
                            )}
                          </span>
                        )}
                      </div>

                      <strong
                        style={{
                          color: "#fff",
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {athlete.distanceKm.toFixed(1)} km
                      </strong>

                      <strong style={{ fontSize: "20px" }}>
                        {isOpen ? "⌄" : "›"}
                      </strong>
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          borderTop: "1px solid #1c527c",
                          padding: "4px 12px 10px",
                          background: "#081f38",
                        }}
                      >
                        {activityHistoryLoading ? (
                          <div
                            style={{
                              padding: "12px 0",
                              color: "#9db6ce",
                              fontSize: "12px",
                            }}
                          >
                            Cargando historial...
                          </div>
                        ) : activityHistory.length === 0 ? (
                          <div
                            style={{
                              padding: "12px 0",
                              color: "#9db6ce",
                              fontSize: "12px",
                            }}
                          >
                            No hay actividades registradas.
                          </div>
                        ) : (
                          activityHistory.map((activity) => (
                            <div
                              key={activity.id}
                              style={{
                                padding: "10px 0",
                                borderBottom:
                                  "1px solid rgba(56, 189, 248, 0.16)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "7px",
                                }}
                              >
                                {canApplyPenalty && activity.hasPendingVar && (
                                  <input
                                    type="checkbox"
                                    checked={selectedPenaltyActivities.includes(activity.id)}
                                    onChange={() => togglePenaltyActivity(activity.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={"Seleccionar " + activity.name + " para penalización"}
                                    style={{
                                      width: "17px",
                                      height: "17px",
                                      margin: 0,
                                      cursor: "pointer",
                                      accentColor: "#ffcc00",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}

                                <strong
                                  style={{
                                    color: "#fff",
                                    fontSize: "13px",
                                  }}
                                >
                                  {activity.name}
                                </strong>

                                {(activity.hasOverlap || activity.hasSpeedReview) && (
                                  <button
                                    type="button"
                                    title={
                                      activity.isPenalized
                                        ? "Ver penalización aplicada"
                                        : activity.hasOverlap && activity.hasSpeedReview ? "Posible superposición y alerta de velocidad" : activity.hasSpeedReview ? "Actividad pendiente de revisión por velocidad" : "Actividad con posible superposición"
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation();

                                      if (!activity.isPenalized || !activity.penalty) {
                                        return;
                                      }

                                      window.alert(
                                        "Regulación ViaRank · Rankings Deportivos\n\n" +
                                          "Penalización aplicada\n\n" +
                                          "Motivo: actividades superpuestas\n" +
                                          "Actividad computada: 0,01 km\n" +
                                          "Aplicación: " +
                                          new Date(
                                            activity.penalty.appliedAt
                                          ).toLocaleString("es-AR")
                                      );
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: "17px",
                                      height: "11px",
                                      padding: 0,
                                      borderRadius: "2px",
                                      background: "#ffff00",
                                      border: "1px solid #e1c900",
                                      color: "#282000",
                                      fontSize: "9px",
                                      lineHeight: 1,
                                      fontWeight: 900,
                                      flexShrink: 0,
                                      cursor:
                                        activity.isPenalized && activity.penalty
                                          ? "pointer"
                                          : "default",
                                    }}
                                  >
                                    {activity.isPenalized ? "?" : ""}
                                  </button>
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop: "4px",
                                  color: "#9db6ce",
                                  fontSize: "12px",
                                }}
                              >
                                {new Date(activity.startDate).toLocaleString(
                                  "es-AR"
                                )}
                                {" · "}
                                {activity.distanceKm.toLocaleString("es-AR")} km
                                {" · "}
                                {Math.floor(activity.movingTime / 3600).toString().padStart(2, "0")}:{Math.floor((activity.movingTime % 3600) / 60).toString().padStart(2, "0")}:{Math.floor(activity.movingTime % 60).toString().padStart(2, "0")}
                                {" · "}
                                {activity.averageSpeed != null ? `${(activity.averageSpeed * 3.6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km/h` : "Velocidad no disponible"}
                                {" · "}
                                {activity.source}
                              </div>
                            </div>
                          ))
                        )}

                        {canApplyPenalty &&
                          activityHistory.some(
                            (activity) => activity.hasPendingVar
                          ) && (
                            <div
                              style={{
                                marginTop: "12px",
                                paddingTop: "12px",
                                borderTop: "1px solid rgba(56, 189, 248, 0.20)",
                              }}
                            >
                              <div
                                style={{
                                  color: "#9db6ce",
                                  fontSize: "11px",
                                  marginBottom: "8px",
                                }}
                              >
                                Seleccionadas: {selectedPenaltyActivities.length}
                              </div>

                              <button
                                type="button"
                                disabled={
                                  applyingPenalty ||
                                  selectedPenaltyActivities.length < 1
                                }
                                onClick={handleApplyPenalty}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  borderRadius: "9px",
                                  border: "1px solid #ff4d4d",
                                  background:
                                    selectedPenaltyActivities.length >= 1 &&
                                    !applyingPenalty
                                      ? "#a51f2b"
                                      : "#493039",
                                  color: "#fff",
                                  fontSize: "12px",
                                  fontWeight: 900,
                                  cursor:
                                    selectedPenaltyActivities.length >= 1 &&
                                    !applyingPenalty
                                      ? "pointer"
                                      : "not-allowed",
                                  opacity:
                                    selectedPenaltyActivities.length >= 1
                                      ? 1
                                      : 0.65,
                                }}
                              >
                                {applyingPenalty
                                  ? "APLICANDO PENALIZACIÓN..."
                                  : "APLICAR PENALIZACIÓN"}
                              </button>

                              {penaltyMessage && (
                                <div
                                  style={{
                                    marginTop: "8px",
                                    color: "#d7e7f5",
                                    fontSize: "11px",
                                    textAlign: "center",
                                  }}
                                >
                                  {penaltyMessage}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        ) : activeTab === "events" ? (
          <section>
            

            {eventsLoading ? (
              <div
                style={{
                  ...card,
                  padding: "18px",
                  textAlign: "center",
                  marginBottom: "12px",
                  color: "#9db6ce",
                }}
              >
                Cargando eventos...
              </div>
            ) : events.length === 0 ? (
              <div
                style={{
                  ...card,
                  padding: "18px",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                <div style={{ color: "#ff8a00", fontSize: "26px", marginBottom: "8px" }}>
                  ●  ▣
                </div>
                <strong style={{ display: "block", fontSize: "15px" }}>
                  No hay próximos eventos
                </strong>
                <div style={{ color: "#8faac1", fontSize: "12px", marginTop: "5px" }}>
                  Cuando se programe una salida aparecerá aquí.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px", marginBottom: "14px" }}>
                {selectedEvent ? (
  modoParticipante ? (
    <FichaSumarmeSalida
      event={selectedEvent}
      coverImage={sportCiclismo}
      weather={selectedEventWeather}      onBack={() => {
        setSelectedEvent(null);
        setModoParticipante(false);
        setShowEventForm(false);
      }}
    />
  ) : (
    <FichaInscripcionEvento
      event={selectedEvent}
      coverImage={sportCiclismo}
      onEdit={canCreateEvents ? () => startEditingEvent(selectedEvent) : undefined}
      onBack={() => {
        setSelectedEvent(null);
        setModoParticipante(false);
        setShowEventForm(false);
      }}
    />
  )
) : upcomingEvents.map((event) => (
                  <>










                  
<style>{`
@media (max-width: 600px) {
  .vr-evento-compacto {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 12px !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  .vr-evento-foto-clima {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
    width: 100% !important;
    gap: 12px !important;
  }

  .vr-evento-foto-clima > div {
    flex-shrink: 0;
  }

  .vr-evento-estado-info {
    display: grid !important;
    grid-template-columns: 34px minmax(0, 1fr) !important;
    gap: 10px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .vr-evento-estado-info > div:nth-child(1) {
    grid-column: 1;
    grid-row: 1;
  }

  .vr-evento-estado-info > div:nth-child(2) {
    grid-column: 2;
    grid-row: 1;
  }

  .vr-evento-estado-info > div:nth-child(3) {
    grid-column: 1 / -1;
    grid-row: 2;
    min-width: 0 !important;
    width: 100%;
    overflow-wrap: anywhere;
  }
}
`}</style><style>{`
@media (max-width: 600px) {
  .vr-evento-compacto {
    padding: 9px !important;
    gap: 5px !important;
  }
  .vr-evento-foto-clima {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    gap: 8px !important;
  }
  .vr-evento-foto-clima > div:first-child {
    width: 75px !important;
    height: 80px !important;
  }
  .vr-evento-foto-clima > div:nth-child(2) {
    width: 125px !important;
  }
  .vr-evento-estado-info {
    display: grid !important;
    grid-template-columns: 28px 115px minmax(0, 1fr) !important;
    gap: 5px !important;
    width: 100% !important;
  }
  .vr-evento-estado-info > div:nth-child(1) {
    grid-column: 1;
    grid-row: 1;
  }
  .vr-evento-estado-info > div:nth-child(2) {
    grid-column: 2;
    grid-row: 1;
  }
  .vr-evento-estado-info > div:nth-child(3) {
    grid-column: 3;
    grid-row: 1;
    min-width: 0 !important;
  }
  .vr-evento-datos-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 5px 9px !important;
  }
  .vr-evento-datos-compactos {
    margin-top: 0 !important;
    gap: 4px !important;
  }
}
`}</style><style>{`
@media (max-width: 600px) {
  .vr-evento-compacto {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 6px !important;
    padding: 9px !important;
  }

  .vr-evento-datos-superiores {
    grid-row: 1 !important;
    grid-column: 1 !important;
    margin-left: 215px !important;
    min-width: 0 !important;
    align-self: start !important;
  }

  .vr-evento-datos-superiores .vr-evento-datos-grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 4px !important;
    font-size: 11px !important;
  }

  .vr-evento-foto-clima {
    grid-row: 1 !important;
    grid-column: 1 !important;
    width: 205px !important;
    align-self: start !important;
  }

  .vr-evento-estado-info {
    grid-row: 2 !important;
    grid-column: 1 !important;
    margin-top: 0 !important;
  }
}
`}</style><div key={event.id} className="vr-evento-compacto" style={{
  background:"radial-gradient(ellipse at 95% 0%,#185887,#103a60 40%,#071b32)",
  border:"1px solid #148cff",
  borderRadius:16,
  padding:12,
  display:"grid",
  gap:10,
  minWidth:0,
  boxShadow:"0 0 18px rgba(20,140,255,.16)"
}}>
  <strong style={{
    color:"#ff981f",
    fontSize:19,
    fontWeight:900,
    overflowWrap:"anywhere"
  }}>
    {event.title}
  </strong>

  <div style={{
    display:"flex",
    flexWrap:"wrap",
    alignItems:"center",
    gap:"7px 18px",
    color:"#ffffff",
    fontSize:15,
    fontWeight:800
  }}>
    <span>📅 {new Date(event.eventDate).toLocaleDateString("es-AR")}</span>
    <span>🕒 {event.departureTime} hs</span>
  </div>

  <div style={{display:"flex",justifyContent:"flex-start"}}>
    <EstadoEvento status={event.status} />
  </div>
<BotonesEvento
  canCreateEvents={canCreateEvents}
  publicationStatus={event.publicationStatus}
  onPublish={() => changeEventPublication(event)}
  onWhatsApp={() => {
    if (event.publicationStatus !== "PUBLISHED") return;
    const fecha = new Date(event.eventDate).toLocaleDateString("es-AR");
    const mensaje = `🚴 ViaRank · ${group.name}\n${event.title}\n📅 ${fecha} · ${event.departureTime}\n📍 Encuentro: ${event.meetingPlace}${event.destination ? `\n🏁 Destino: ${event.destination}` : ""}\nAbrí ViaRank para consultar el evento y sumarte a la salida:\nhttps://viarank-1.onrender.com/`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  }}
  onDetails={() => { if (canCreateEvents) { setModoParticipante(false); startEditingEvent(event); } else { setModoParticipante(true); setSelectedEvent(event); setShowEventForm(false); } }}
  onDelete={() => deleteGroupEvent(event)}
/>
                  </div>
                  </>
                ))}
              </div>
            )}
            {canCreateEvents && !selectedEvent && (!showEventForm ? (
              <button
                onClick={startCreatingEvent}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "11px",
                  border: "1px solid #2584c5",
                  background: "#0f4774",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                + Crear evento
              </button>
            ) : editingEvent?.publicationStatus === "PUBLISHED" ? (
  <EstadoEventoPublicado
    titulo={editingEvent.title}
    fecha={editingEvent.eventDate}
    hora={editingEvent.departureTime}
    destino={editingEvent.destination || ""}
    estado={eventStatus || "CONFIRMED"}
    guardando={savingEvent}
    error={eventValidation}
    onEstadoChange={setEventStatus}
    onGuardar={async () => {
      if (!editingEvent || savingEvent) return;
      try {
        setSavingEvent(true);
        setEventValidation("");
        const response = await fetch(
          `${apiUrl}/api/groups/${encodeURIComponent(group.id)}/events/${encodeURIComponent(editingEvent.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}`,
            },
            body: JSON.stringify({ status: eventStatus || "CONFIRMED" }),
          }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo guardar el estado.");
        setShowEventForm(false);
        setEditingEvent(null);
        await loadEvents();
      } catch (error) {
        setEventValidation(error instanceof Error ? error.message : "Error al guardar.");
      } finally {
        setSavingEvent(false);
      }
    }}
    onGuardarWhatsApp={async () => {
      if (!editingEvent || savingEvent) return;

      // Abrir la ventana durante el clic evita el bloqueo de ventanas emergentes.
      const whatsappWindow = window.open("about:blank", "_blank");

      try {
        setSavingEvent(true);
        setEventValidation("");

        const estadoSeleccionado = eventStatus || "CONFIRMED";

        const response = await fetch(
          `${apiUrl}/api/groups/${encodeURIComponent(group.id)}/events/${encodeURIComponent(editingEvent.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}`,
            },
            body: JSON.stringify({ status: estadoSeleccionado }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "No se pudo guardar el estado.");
        }

        const nombreEstado =
          estadoSeleccionado === "CONFIRMED" ? "CONFIRMADO" :
          estadoSeleccionado === "EVALUATING" ? "EN EVALUACIÓN" :
          "SUSPENDIDO";

        const simbolo =
          estadoSeleccionado === "CONFIRMED" ? "[CONFIRMADO]" :
          estadoSeleccionado === "EVALUATING" ? "[EN EVALUACION]" : "[SUSPENDIDO]";

        const fecha = editingEvent.eventDate.slice(0, 10);
        const fechaVisible = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
          ? `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`
          : fecha;

        const mensaje = [
          "ViaRank - Actualización de salida",
          "",
          `Grupo: ${group.name}`,
          `Evento: ${editingEvent.title}`,
          `Fecha: ${fechaVisible}`,
          `Hora: ${editingEvent.departureTime}`,
          `Destino: ${editingEvent.destination || "Sin destino"}`,
          "",
          `${simbolo} Estado: ${nombreEstado}`,
          "",
          "Abrí ViaRank para consultar el evento y sumarte a la salida:\nhttps://viarank-1.onrender.com/",
        ].join("\n");

        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

        if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }

        setShowEventForm(false);
        setEditingEvent(null);
        await loadEvents();
      } catch (error) {
        if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.close();
        }
        setEventValidation(
          error instanceof Error ? error.message : "Error al guardar."
        );
      } finally {
        setSavingEvent(false);
      }
    }}
    onCancelar={() => {
      setShowEventForm(false);
      setEditingEvent(null);
      setEventValidation("");
    }}
  />
) : (<div className="viarank-event-form-luminous" style={{ ...card, padding: "12px", background: "radial-gradient(ellipse at 85% 0%,rgba(28,161,255,.20),transparent 45%),linear-gradient(145deg,#0b3156,#09233e)", border:"1px solid #2492d7", boxShadow:"0 8px 26px rgba(0,0,0,.25),inset 0 1px rgba(128,214,255,.20)" }}>
                <style>{`.viarank-event-form-luminous input:focus, .viarank-event-form-luminous select:focus, .viarank-event-form-luminous textarea:focus {outline:2px solid #4cc9ff!important;outline-offset:1px} .viarank-event-form-luminous button {transition:filter .15s ease,box-shadow .15s ease} .viarank-event-form-luminous button:hover {filter:brightness(1.14);box-shadow:0 0 9px rgba(75,190,255,.2)} .viarank-event-form-luminous input[type=checkbox] {accent-color:#139af2} .viarank-event-form-luminous textarea {resize:vertical}`}</style>
                <div style={{marginBottom:12}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
  <strong style={{color:"#67caff",fontWeight:900,fontSize:21,textAlign:"center"}}>
    {editingEvent !== null ? "Editar evento" : "Crear evento"}
  </strong>
  {editingEvent !== null && (
    <button
      type="button"
      disabled={savingEvent}
      onClick={startCreatingEvent}
      style={{padding:"6px 10px",borderRadius:8,border:"1px solid #39b9f4",background:"#0b3156",color:"#ffffff",fontSize:12,fontWeight:800,cursor:"pointer"}}
    >
      + Crear evento
    </button>
  )}
</div>
</div>
<h3 style={{margin:"0 0 12px",fontSize:18,fontWeight:800,color:"#ffffff"}}>Crear y editar eventos</h3>
                <div style={{ marginBottom: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "7px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 800 }}>
                      Elegir salida guardada
                    </span>
                    <button
                      type="button"
                      title="Recupera los datos de una salida habitual para crear un nuevo evento."
                      aria-label="Ayuda sobre salidas guardadas"
                      style={{
                        border: "1px solid #2584c5",
                        borderRadius: "50%",
                        background: "#123b60",
                        color: "#fff",
                        width: "22px",
                        height: "22px",
                        cursor: "help",
                      }}
                    >
                      ?
                    </button>
                  </div>
                  <select
                    defaultValue=""
                    disabled={templatesLoading || eventTemplates.length === 0}
                    onChange={(e) => {
                      const template = eventTemplates.find(
                        (item) => item.id === e.target.value
                      );

                      if (!template) return;

                      setEventTitle(template.title);
                      setMeetingPlace(template.meetingPlace || "");
                      setDestination(template.destination || "");
                      setDepartureTime(template.departureTime || "");
                      setEstimatedReturn(template.estimatedReturn || "");
                      setPlannedSpeed(template.plannedSpeed || "");
                      setEventRules(template.rules || "");
                    }}
                    style={{ ...eventInputStyle, width: "100%" }}
                  >
                    <option value="">
                      {templatesLoading
                        ? "Cargando salidas..."
                        : eventTemplates.length === 0
                          ? "Todavía no hay salidas guardadas"
                          : "Seleccionar salida habitual"}
                    </option>
                    {eventTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>

                
                <div style={{ display: "grid", gap: "11px" }}>
                  <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Título de la salida * <button type="button" title="Elegí un nombre claro para identificar el evento." aria-label="Ayuda: Título de la salida *" onClick={() => window.alert("Elegí un nombre claro para identificar el evento.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>
                  <input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Título de la salida"
                    style={eventInputStyle}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "9px",
                    }}
                  >
                    <div>
                      <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Fecha de salida * <button type="button" title="Día en que se realizará la salida." aria-label="Ayuda: Fecha de salida *" onClick={() => window.alert("Día en que se realizará la salida.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>
                      <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      style={eventInputStyle}
                    />
                    </div>
                    <div>
                      <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Hora de salida * <button type="button" title="Horario previsto para comenzar la actividad." aria-label="Ayuda: Hora de salida *" onClick={() => window.alert("Horario previsto para comenzar la actividad.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>
                      <EventTimeSelect value={departureTime} onChange={setDepartureTime} />
                    </div>
                  </div>

                  <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Lugar de encuentro * <button type="button" title="Indicá dónde deben reunirse los participantes." aria-label="Ayuda: Lugar de encuentro *" onClick={() => window.alert("Indicá dónde deben reunirse los participantes.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>

                  <input
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                    placeholder="Lugar de encuentro"
                    style={eventInputStyle}
                  />

                  <div style={{background:"#102e49",border:"1px solid #2584c5",borderRadius:12,padding:"7px 11px",display:"grid",gap:4}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                      <strong style={{fontSize:12,color:"#fff"}}>Pronóstico para la salida</strong>
                      <span title="Según ubicación del organizador" style={{fontSize:10,color:"#a9c5d9"}}>Ubicación del organizador ⓘ</span>
                    </div>
                    {eventWeatherLoading ? <span style={{fontSize:12,color:"#b9d0e3"}}>Consultando pronóstico...</span> : eventWeather ? (
                      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
                        <EventWeatherIcon weatherCode={eventWeather.weatherCode} size={38}/>
                        <strong style={{fontSize:21,color:"#fff",whiteSpace:"nowrap"}}>{Math.round(eventWeather.temperature)} °C</strong>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 12px",fontSize:11,color:"#d5e8f5",flex:1,minWidth:0}}>
                          <span>Lluvia: {eventWeather.precipitationProbability} %</span>
                          <span>Viento: {eventWeather.windSpeed} km/h</span>
                          <span>Precip.: {eventWeather.precipitation} mm</span>
                          <span>Ráfagas: {eventWeather.windGusts} km/h</span>
                        </div>
                      </div>
                    ) : <span style={{fontSize:12,color:"#b9d0e3"}}>{eventWeatherMessage || "Seleccioná fecha y hora para consultar el pronóstico."}</span>}
                  </div>
                  <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Destino <button type="button" title="Lugar al que se dirige el grupo." aria-label="Ayuda: Destino" onClick={() => window.alert("Lugar al que se dirige el grupo.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>

                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Destino"
                    style={eventInputStyle}
                  />

                  <div>
                    <div
                      style={{
                        color: "#8faac1",
                        fontSize: "11px",
                        marginBottom: "5px",
                      }}
                    >
                      Regreso estimado
                    </div>

                    <EventTimeSelect value={estimatedReturn} onChange={setEstimatedReturn} />
                  </div>

                  <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Velocidad prevista <button type="button" title="Podés escribir una velocidad o un ritmo aproximado." aria-label="Ayuda: Velocidad prevista" onClick={() => window.alert("Podés escribir una velocidad o un ritmo aproximado.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>

                  <input
                    value={plannedSpeed}
                    onChange={(e) => setPlannedSpeed(e.target.value)}
                    placeholder="Velocidad prevista"
                    style={eventInputStyle}
                  />

                  <div style={{ color: "#b9d0e3", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>Reglas y observaciones <button type="button" title="Indicá las normas y recomendaciones para participar." aria-label="Ayuda: Reglas y observaciones" onClick={() => window.alert("Indicá las normas y recomendaciones para participar.")} style={{marginLeft:"6px",width:"20px",height:"20px",borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff",fontSize:"12px",fontWeight:800,cursor:"pointer"}}>?</button></div>

                  {/* VIARANK_EVENTOS_FORMULARIO_V2 */}
                  <section style={{display:"grid",gap:12,padding:14,border:"1px solid #2584c5",borderRadius:13,background:"linear-gradient(135deg,#0b3c68,#125b91 55%,#0b3356)",boxShadow:"inset 0 1px rgba(152,224,255,.25),0 4px 16px rgba(0,0,0,.14)"}}>
                    <div style={{display:"grid",gap:10,padding:12,border:"1px solid #39a9ee",borderRadius:12,background:"#082b4c"}}>
                      <strong style={{color:"#67caff",fontSize:16}}>Deportes del evento</strong>
                      <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                        {EVENT_SPORTS.map(sport => (
                          <label key={sport} style={{display:"flex",alignItems:"center",gap:5,color:"#fff",fontSize:12}}>
                            <input type="checkbox" checked={eventSports.includes(sport)}
                              onChange={e => setEventSports(current =>
                                e.target.checked ? [...current, sport] : current.filter(s => s !== sport)
                              )} />
                            {sport}
                          </label>
                        ))}
                      </div>
                      {(eventSports.includes("Triatlón") ? ["Natación","Ciclismo","Carrera",...eventSports.filter(s => s !== "Triatlón" && !["Natación","Ciclismo","Carrera"].includes(s))] : eventSports).map(sport => (
                        <div key={sport} style={{display:"grid",gap:8,padding:10,border:"1px solid #247fb7",borderRadius:9}}>
                          <strong style={{color:"#ffad43",fontSize:14}}>{sport}</strong>
                          {(EVENT_SPORT_FIELDS[sport] || []).map(field => (
                            <label key={field.key} style={{display:"grid",gap:5,color:"#cde8f8",fontSize:12}}>
                              {field.label}
                              <select
                                value={eventSportDetails[sport]?.[field.key] || ""}
                                onChange={e => setEventSportDetails(current => ({
                                  ...current,
                                  [sport]: {...current[sport], [field.key]: e.target.value}
                                }))}
                                style={eventInputStyle}
                              >
                                <option value="">Sin especificar</option>
                                {field.options.map(option => <option key={option}>{option}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    {eventSports.includes("Ciclismo") && (<>
                    <strong style={{fontSize:16,color:"#fff"}}>Recorrido y características</strong>
                    <label style={{fontSize:12,color:"#b9d0e3"}}>Descripción del recorrido
                      <textarea rows={3} value={eventRouteDescription} onChange={e=>setEventRouteDescription(e.target.value)} placeholder="Detalles de la ruta" style={{...eventInputStyle,width:"100%",marginTop:5}} />
                    </label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                      <label style={{fontSize:12,color:"#b9d0e3"}}>Distancia aproximada (km)
                        <input type="number" min="0" value={eventDistance} onChange={e=>setEventDistance(e.target.value)} style={{...eventInputStyle,width:"100%",marginTop:5}} />
                      </label>
                      <label style={{fontSize:12,color:"#b9d0e3"}}>Desnivel (m)
                        <input type="number" min="0" value={eventElevation} onChange={e=>setEventElevation(e.target.value)} style={{...eventInputStyle,width:"100%",marginTop:5}} />
                      </label>
                    </div>
                    <label style={{fontSize:12,color:"#b9d0e3"}}>Superficie
                      <select value={eventSurface} onChange={e=>setEventSurface(e.target.value)} style={{...eventInputStyle,width:"100%",marginTop:5}}>
                        <option value="">Sin especificar</option><option>Asfalto</option><option>Tierra</option><option>Mixto</option>
                      </select>
                    </label>
                    <div style={{fontSize:12,color:"#b9d0e3"}}>Dificultad <button type="button" title="Nivel orientativo del recorrido" onClick={()=>window.alert("Nivel orientativo del recorrido: baja, media o alta.")} style={{borderRadius:"50%",border:"1px solid #4baef2",background:"#125486",color:"#fff"}}>?</button></div>
                    <select value={eventDifficulty} onChange={e=>setEventDifficulty(e.target.value)} style={eventInputStyle}><option value="">Sin especificar</option><option>Baja</option><option>Media</option><option>Alta</option></select>
                    <strong style={{fontSize:13,color:"#fff"}}>Tipos de bicicleta admitidos (solo para ciclismo)</strong>
                    <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                      {["Todas","Ruta","Gravel","MTB","Plegable","Eléctrica"].map(tipo=><label key={tipo} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#d5e8f5"}}><input type="checkbox" checked={eventBicycleTypes.includes(tipo)} onChange={e=>setEventBicycleTypes(actual=>tipo==="Todas"?(e.target.checked?["Todas"]:[]):(e.target.checked?[...actual.filter(x=>x!=="Todas"),tipo]:actual.filter(x=>x!==tipo)))}/>{tipo}</label>)}
                    </div>
                    </>)}
                  </section>
                  <section style={{display:"grid",gap:11,padding:14,border:"1px solid #2584c5",borderRadius:13,background:"linear-gradient(135deg,#0c385e,#104c78)",boxShadow:"inset 0 1px rgba(152,224,255,.2)"}}>
                    <strong style={{fontSize:16,color:"#fff"}}>Alimentación</strong>
                    <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                      {["Desayuno","Almuerzo","Merienda","Cena"].map(comida=><label key={comida} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#d5e8f5"}}><input type="checkbox" checked={eventFood.includes(comida)} onChange={e=>setEventFood(actual=>e.target.checked?[...actual,comida]:actual.filter(x=>x!==comida))}/>{comida}</label>)}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{eventFood.map(comida=><label key={comida} style={{fontSize:12,color:"#b9d0e3"}}>{comida} · horario<EventTimeSelect value={eventFoodTimes[comida]??""} onChange={hora=>setEventFoodTimes(actual=>({...actual,[comida]:hora}))}/></label>)}</div>
                    <div style={{display:"grid",gap:9}}>
  <strong style={{fontSize:13,color:"#d8efff"}}>Indicaciones sobre la vianda</strong>
  {([
    ["RECOMMENDED","Se recomienda llevar vianda"],
    ["NOT_PLANNED","En esta salida no está previsto llevar vianda"],
    ["OPTIONAL","Quien lo desee puede llevar vianda"]
  ] as const).map(([valor,texto])=>(
    <label key={valor} style={{display:"flex",alignItems:"center",gap:9,fontSize:12,color:"#d5e8f5",cursor:"pointer"}}>
      <input
        type="radio"
        name="viarank-vianda"
        checked={eventBringFoodOption===valor}
        onChange={()=>setEventBringFoodOption(valor)}
      />
      {texto}
    </label>
  ))}
</div>
                    <small style={{color:"#9fc6e4"}}>ViaBreak va a estar disponible pronto y te va a solucionar un gran problema.</small>
                  </section>
                  <section style={{display:"grid",gap:10,padding:14,border:"1px solid #2584c5",borderRadius:13,background:"linear-gradient(135deg,#0c385e,#104c78)",boxShadow:"inset 0 1px rgba(152,224,255,.2)"}}>
                    <strong style={{fontSize:16,color:"#fff"}}>Estado del evento</strong>
                    <div style={{display:"flex",alignItems:"center",gap:15}}>
                      <div style={{display:"grid",gap:7,padding:9,borderRadius:14,background:"#071d31"}}>
                        {([ ["CONFIRMED","#22c55e"], ["EVALUATING","#eab308"], ["SUSPENDED","#ef4444"] ] as const).map(([estado,color])=><span key={estado} style={{width:13,height:13,borderRadius:"50%",background:color,opacity:eventStatus===estado?1:0.2,boxShadow:eventStatus===estado?`0 0 12px ${color}`:"none"}}/>)}
                      </div>
                      <select value={eventStatus} onChange={e=>setEventStatus(e.target.value as typeof eventStatus)} style={{...eventInputStyle,flex:1}}><option value="">Elegir estado...</option><option value="CONFIRMED">Confirmado</option><option value="EVALUATING">En evaluación</option><option value="SUSPENDED">Suspendido</option></select>
                    </div>
                    <small style={{color:"#a9c5d9"}}>El estado se guardará al crear el evento.</small>
                  </section>
                  <section style={{display:"grid",gap:9,padding:12,border:"1px solid #2584c5",borderRadius:11,background:"linear-gradient(135deg,#0b3b63,#10517e)",boxShadow:"inset 0 1px rgba(152,224,255,.25)"}}>
                    <strong style={{fontSize:13,color:"#fff"}}>Equipamiento obligatorio para ciclismo</strong>
                    <small style={{color:"#b8e5ff"}}>Escribí y editá los requisitos de esta salida.</small>
                    <textarea rows={3} value={eventEquipmentText} onChange={e=>setEventEquipmentText(e.target.value)} style={{...eventInputStyle,width:"100%"}}/>
                    <small style={{color:"#b8e5ff"}}>Recomendados: hidratación, abrigo, protector solar, guantes y anteojos.</small>
                  </section>
                  <section style={{display:"grid",gap:7,padding:12,border:"1px solid #2584c5",borderRadius:11,background:"linear-gradient(135deg,#0c385e,#104c78)"}}>
                    <strong style={{fontSize:13,color:"#fff"}}>Deslinde de responsabilidad</strong>
                    <textarea rows={3} value={eventDisclaimer} onChange={e=>setEventDisclaimer(e.target.value)} style={eventInputStyle}/>
                    <small style={{color:"#b8e5ff"}}>La inscripción deberá registrar una aceptación expresa del participante. Esa función aún no está implementada.</small>
                  </section>
                  <textarea
                    value={eventRules}
                    onChange={(e) => setEventRules(e.target.value)}
                    placeholder="Reglas / observaciones"
                    rows={4}
                    style={{
                      ...eventInputStyle,
                      resize: "vertical",
                    }}
                  />

<style>{`
  .viarank-event-3d {

    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;

    border-radius: 12px !important;
    box-sizing: border-box !important;
    font-size: 14px !important;

    font-weight: 900 !important;
    text-shadow: 0 1px 2px rgba(0,0,0,.5);
    box-shadow: inset 0 2px 2px rgba(255,255,255,.3),
                inset 0 -4px 5px rgba(0,0,0,.25),
                0 5px 0 rgba(0,0,0,.3),
                0 9px 16px rgba(0,0,0,.25);
    transition: transform .12s, box-shadow .12s, filter .12s;
  
    height: 36px !important;
    min-height: 36px !important;
    padding: 1px 8px !important;
    line-height: 1.05 !important;
    box-sizing: border-box !important;
}
  .viarank-event-3d:hover:not(:disabled) {
    filter: brightness(1.13);
  }
  .viarank-event-3d:active:not(:disabled) {
    transform: translateY(4px);
    box-shadow: inset 0 2px 5px rgba(0,0,0,.3),
                0 1px 0 rgba(0,0,0,.3);
  }
  .viarank-event-3d:disabled {
    cursor: not-allowed;
  }
`}</style>
                  <style>{`
  .vr-boton-evento {
    width: 100% !important;

    box-sizing: border-box;
    display: flex !important;
    align-items: center;
    justify-content: center;

    border-radius: 13px !important;
    font-size: 13px !important;
    font-weight: 900 !important;

    text-align: center;
    color: #fff !important;
    text-shadow: 0 2px 2px rgba(0,0,0,.55);
    box-shadow:
      inset 0 3px 2px rgba(255,255,255,.45),
      inset 0 -6px 7px rgba(0,0,0,.35),
      0 5px 0 rgba(0,0,0,.5),
      0 9px 16px rgba(0,0,0,.35) !important;
    transition: transform .12s, filter .12s, box-shadow .12s;
  
    height: 36px !important;
    min-height: 36px !important;
    padding: 1px 8px !important;
    line-height: 1.05 !important;
    box-sizing: border-box !important;
}
  .vr-boton-evento:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  .vr-boton-evento:active:not(:disabled) {
    transform: translateY(4px);
    box-shadow: inset 0 3px 5px rgba(0,0,0,.3),0 1px 0 rgba(0,0,0,.4) !important;
  }
  .vr-fila-boton {
    display: grid;
    grid-template-columns: minmax(0,1fr) 28px;
    gap: 8px;
    align-items: center;
  }
  .vr-ayuda-boton {
    width: 27px;
    height: 27px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #ff981f;
    font-weight: 400;
    font-size: 19px;
    cursor: help;
    box-shadow: none;
  }
`}</style>
<div className="vr-fila-boton"><button className="viarank-event-3d vr-boton-evento"
                    type="button"
                    disabled={templatesLoading}
                    onClick={() => void saveEventTemplate()}
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border: "1px solid #2584c5",
                      background: "#123b60",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: templatesLoading ? "wait" : "pointer",
                      opacity: templatesLoading ? 0.6 : 1,
                    }}
                  >
                    {templatesLoading
                      ? "Generando plantilla..."
                      : "Generar plantilla de evento habitual"}
                  </button><button type="button" className="vr-ayuda-boton" aria-label="Ayuda" onClick={() => window.alert("Genera una plantilla reutilizable. No publica el evento ni modifica los anteriores.")}>?</button></div>
                  

                  <div style={{ display: "grid", gap: 9 }}>
                    {eventValidation && <div role="alert" style={{background:"#56351e",border:"1px solid #ffae54",borderRadius:9,padding:"10px 12px",color:"#fff0d9",fontSize:13,fontWeight:700}}>{eventValidation}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffad40", fontWeight: 800 }}>
                      Opciones para guardar
                      <button type="button" aria-label="Ayuda sobre guardar y publicar" title="Ayuda" onClick={() => window.alert("Borrador: los atletas todavía no lo ven. Publicar en ViaRank: los atletas pueden consultarlo. ViaRank y WhatsApp: primero se publica y después se abre WhatsApp con el mensaje listo; vos elegís a quién enviarlo.")} style={{ background: "transparent", border: "none", borderRadius: 0, width: 23, height: 23, color: "#ffad40", fontWeight: 900, cursor: "pointer" }}>?</button>
                    </div>
                    {false ? (
                      <>
                        <div style={{ color: "#c9e5f8", fontSize: 12 }}>
                          Este evento ya está publicado. Guardá solamente correcciones menores. Para cambiar la salida, suspendé este evento y creá uno nuevo.
                          <button type="button" aria-label="Ayuda para editar eventos publicados" onClick={() => window.alert("ATENCIÓN: EVENTO PUBLICADO.\n\nEste evento ya está publicado y solo permite correcciones menores.\n\nSi necesitás cambiar la fecha, el horario, el recorrido o el destino, suspendé el evento original y creá uno nuevo.")} style={{ marginLeft: 7, border: "none", borderRadius: 0, background: "transparent", color: "#ffad40", fontWeight: 900, cursor: "pointer" }}>?</button>
                        </div>
                        <div className="vr-fila-boton"><button className="viarank-event-3d vr-boton-evento" type="button" disabled={savingEvent} onClick={() => saveEventWithPublication("PUBLISHED")} style={{ padding: "8.5px 10px", borderRadius: 9, border: "1px solid #60c7ff", background: "#126399", color: "white", fontWeight: 900, opacity: savingEvent ? 0.6 : 1 }}> {savingEvent ? "Guardando..." : "Guardar correcciones"} </button><button type="button" className="vr-ayuda-boton" aria-label="Ayuda" onClick={() => window.alert("Publica el evento en ViaRank para que los atletas puedan consultarlo.")}>?</button></div>
                      </>
                    ) : (
                      <>
                        <div className="vr-fila-boton"><button className="viarank-event-3d vr-boton-evento" type="button" disabled={savingEvent} onClick={() => saveEventWithPublication("DRAFT")} style={{ padding: "8.5px 10px", borderRadius: 9, border: "1px solid #79b4d8", background: "#17436a", color: "white", fontWeight: 900, opacity: savingEvent ? 0.6 : 1 }}> {savingEvent ? "Guardando..." : "Guardar como borrador"} </button><button type="button" className="vr-ayuda-boton" aria-label="Ayuda" onClick={() => window.alert("Guarda el evento sin publicarlo. Los atletas todavia no lo ven.")}>?</button></div>
                        <div className="vr-fila-boton"><button className="viarank-event-3d vr-boton-evento" type="button" disabled={savingEvent} onClick={() => saveEventWithPublication("PUBLISHED")} style={{ padding: "8.5px 10px", borderRadius: 9, border: "1px solid #64caff", background: "#087dad", color: "white", fontWeight: 900, opacity: savingEvent ? 0.6 : 1 }}> {savingEvent ? "Guardando..." : "Guardar y publicar en ViaRank"} </button><button type="button" className="vr-ayuda-boton" aria-label="Ayuda" onClick={() => window.alert("Publica el evento en ViaRank para que los atletas puedan consultarlo.")}>?</button></div>
                        <div className="vr-fila-boton"><button className="viarank-event-3d vr-boton-evento" type="button" disabled={savingEvent} onClick={() => saveEventWithPublication("WHATSAPP")} style={{ padding: "8.5px 10px", borderRadius: 9, border: "1px solid #74ffae", background: "#087b49", color: "white", fontWeight: 900, opacity: savingEvent ? 0.6 : 1 }}> {savingEvent ? "Guardando..." : "Guardar y publicar en ViaRank y WhatsApp"} </button><button type="button" className="vr-ayuda-boton" aria-label="Ayuda" onClick={() => window.alert("Publica el evento en ViaRank y abre WhatsApp con un mensaje preparado. Vos elegis a quienes enviarlo.")}>?</button></div>
                      </>
                    )}
                    <button className="viarank-event-3d vr-boton-evento" type="button" disabled={savingEvent} onClick={() => { setEventValidation(""); setEventMessage(""); setShowEventForm(false); setEditingEvent(null); }} style={{ padding: "6.5px 10px", borderRadius: 8, border: "1px solid #315a79", background: "#0b2944", color: "#a9bfd2", fontWeight: 800 }}>Cancelar</button>
                  </div>
                </div>
              </div>
            ))}
            {eventMessage && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "9px",
                  background: "#0b2944",
                  border: "1px solid #2584c5",
                  color: "#b9d9f2",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                {eventMessage}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}














































