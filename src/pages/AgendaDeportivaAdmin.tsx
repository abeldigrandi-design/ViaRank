import { useEffect, useState, type CSSProperties } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const deportes: Record<string, string> = {
  RIDE: "Ciclismo",
  RUN: "Carrera",
  WALK: "Caminata",
  HIKE: "Senderismo",
  SWIM: "Natación",
  KAYAK: "Kayak",
  ROW: "Remo",
  SAIL: "Vela",
  WINDSURF: "Windsurf",
  WHEELCHAIR: "Silla de ruedas",
};

type Evento = {
  id: string;
  title: string;
  eventDate: string;
  endDate: string | null;
  locality: string;
  description: string;
  organizer: string;
  websiteUrl: string;
  sports: string[];
  isActive: boolean;
};

type Formulario = {
  title: string;
  eventDate: string;
  endDate: string;
  locality: string;
  description: string;
  organizer: string;
  websiteUrl: string;
  sports: string[];
  isActive: boolean;
};

const vacio: Formulario = {
  title: "",
  eventDate: "",
  endDate: "",
  locality: "",
  description: "",
  organizer: "",
  websiteUrl: "",
  sports: [],
  isActive: false,
};

const campo: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#071d38",
  border: "1px solid #2876b6",
  borderRadius: 9,
  color: "#fff",
  padding: "10px",
  fontSize: 14,
};

const boton: CSSProperties = {
  padding: "10px 13px",
  borderRadius: 9,
  border: "1px solid #148cff",
  background: "linear-gradient(180deg,#1465a5,#073c72)",
  color: "#fff",
  fontWeight: 750,
  cursor: "pointer",
};

function fechaLocal(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fechaVisible(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? ""
    : fecha.toLocaleDateString("es-AR");
}

function encabezados() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("viarank_auth_token") || ""}`,
  };
}

export default function AgendaDeportivaAdmin() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [form, setForm] = useState<Formulario>({ ...vacio });
  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/agenda-deportiva/admin`, {
        headers: encabezados(),
      });
      if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
      const datos: unknown = await respuesta.json();
      if (!Array.isArray(datos)) throw new Error("Respuesta inesperada");
      setEventos(datos as Evento[]);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "Error al consultar");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  function actualizar<K extends keyof Formulario>(
    clave: K,
    valor: Formulario[K]
  ) {
    setForm(anterior => ({ ...anterior, [clave]: valor }));
  }

  function editar(evento: Evento) {
    setEditando(evento.id);
    setForm({
      title: evento.title,
      eventDate: fechaLocal(evento.eventDate),
      endDate: fechaLocal(evento.endDate),
      locality: evento.locality,
      description: evento.description,
      organizer: evento.organizer,
      websiteUrl: evento.websiteUrl,
      sports: [...evento.sports],
      isActive: evento.isActive,
    });
    setMensaje("");
  }

  function limpiar() {
    setEditando(null);
    setForm({ ...vacio, sports: [] });
    setMensaje("");
  }

  async function guardar() {
    if (guardando) return;

    if (
      !form.title.trim() || !form.eventDate || !form.locality.trim() ||
      !form.description.trim() || !form.organizer.trim() ||
      form.sports.length === 0
    ) {
      setMensaje("Completá todos los campos y seleccioná al menos un deporte.");
      return;
    }

    if (form.endDate && form.endDate < form.eventDate) {
      setMensaje("La fecha de finalización no puede ser anterior al inicio.");
      return;
    }

    const payload = {
      ...form,
      eventDate: new Date(`${form.eventDate}T12:00:00`).toISOString(),
      endDate: form.endDate
        ? new Date(`${form.endDate}T23:59:59`).toISOString()
        : null,
    };

    setGuardando(true);
    setMensaje("");

    try {
      const respuesta = await fetch(
        editando
          ? `${API_URL}/api/agenda-deportiva/${encodeURIComponent(editando)}`
          : `${API_URL}/api/agenda-deportiva`,
        {
          method: editando ? "PUT" : "POST",
          headers: encabezados(),
          body: JSON.stringify(payload),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || `Error HTTP ${respuesta.status}`);
      }

      limpiar();
      await cargar();
      setMensaje("Publicación guardada correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(evento: Evento) {
    if (!window.confirm(`¿Eliminar definitivamente "${evento.title}"?`)) return;

    try {
      const respuesta = await fetch(
        `${API_URL}/api/agenda-deportiva/${encodeURIComponent(evento.id)}`,
        { method: "DELETE", headers: encabezados() }
      );
      if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
      if (editando === evento.id) limpiar();
      await cargar();
      setMensaje("Publicación eliminada.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo eliminar");
    }
  }

  async function cambiarEstado(evento: Evento) {
    try {
      const respuesta = await fetch(
        `${API_URL}/api/agenda-deportiva/${encodeURIComponent(evento.id)}`,
        {
          method: "PUT",
          headers: encabezados(),
          body: JSON.stringify({
            title: evento.title,
            eventDate: evento.eventDate,
            endDate: evento.endDate,
            locality: evento.locality,
            description: evento.description,
            organizer: evento.organizer,
            websiteUrl: evento.websiteUrl,
            sports: evento.sports,
            isActive: !evento.isActive,
          }),
        }
      );
      if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
      await cargar();
      setMensaje("Estado actualizado.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo actualizar");
    }
  }

  return (
    <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
      <h3 style={{ margin: 0 }}>
        {editando ? "Editar publicación" : "Nueva publicación"}
      </h3>

      <label>
        Título (máximo 50 caracteres)
        <input style={campo} maxLength={50} value={form.title}
          onChange={e => actualizar("title", e.target.value)} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>
          Fecha de inicio
          <input style={campo} type="date" value={form.eventDate}
            onChange={e => actualizar("eventDate", e.target.value)} />
        </label>
        <label>
          Fecha de finalización
          <input style={campo} type="date" value={form.endDate}
            min={form.eventDate || undefined}
            onChange={e => actualizar("endDate", e.target.value)} />
        </label>
      </div>

      <label>
        Localidad (máximo 40 caracteres)
        <input style={campo} maxLength={40} value={form.locality}
          onChange={e => actualizar("locality", e.target.value)} />
      </label>

      <label>
        Descripción completa
        <textarea style={{ ...campo, minHeight: 90 }} value={form.description}
          onChange={e => actualizar("description", e.target.value)} />
      </label>

      <label>
        Organizador
        <input style={campo} value={form.organizer}
          onChange={e => actualizar("organizer", e.target.value)} />
      </label>

      <label>
        Sitio oficial del organizador (opcional)
        <input style={campo} type="url" placeholder="https://..."
          value={form.websiteUrl}
          onChange={e => actualizar("websiteUrl", e.target.value)} />
      </label>

      <div>
        <strong>Deportes en los que se mostrará</strong>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 9,
          marginTop: 10,
        }}>
          {Object.entries(deportes).map(([codigo, nombre]) => (
            <label key={codigo} style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <input type="checkbox" checked={form.sports.includes(codigo)}
                onChange={e => actualizar(
                  "sports",
                  e.target.checked
                    ? [...form.sports, codigo]
                    : form.sports.filter(s => s !== codigo)
                )} />
              {nombre}
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: "flex", gap: 9, alignItems: "center" }}>
        <input type="checkbox" checked={form.isActive}
          onChange={e => actualizar("isActive", e.target.checked)} />
        Publicación activa
      </label>

      <div style={{
        border: "1px solid #148cff",
        borderRadius: 12,
        padding: 12,
        background: "linear-gradient(90deg,#0a3155,#082845)",
      }}>
        <strong>Vista previa de la tarjeta</strong>
        <div style={{ marginTop: 10, fontWeight: 800 }}>
          {form.title || "Título del evento"}
        </div>
        <div style={{ fontSize: 13, color: "#b8d9f4", marginTop: 5 }}>
          {form.eventDate
            ? new Date(`${form.eventDate}T12:00:00`).toLocaleDateString("es-AR")
            : "Fecha pendiente"}
          {" · "}
          {form.locality || "Localidad pendiente"}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        <button type="button" style={{ ...boton, flex: 1 }}
          disabled={guardando} onClick={() => void guardar()}>
          {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear publicación"}
        </button>
        <button type="button" style={boton} onClick={limpiar}>
          Limpiar
        </button>
      </div>

      {mensaje && <p role="status" style={{ color: "#facc15", margin: 0 }}>{mensaje}</p>}

      <h3 style={{ margin: "10px 0 0" }}>Publicaciones existentes</h3>

      {cargando && <p>Cargando publicaciones...</p>}
      {!cargando && eventos.length === 0 && <p>No hay publicaciones cargadas.</p>}

      {eventos.map(evento => (
        <div key={evento.id} style={{
          border: "1px solid rgba(20,140,255,.45)",
          background: "#092743",
          borderRadius: 11,
          padding: 12,
          display: "grid",
          gap: 8,
        }}>
          <strong>{evento.title}</strong>
          <span style={{ fontSize: 13 }}>
            {fechaVisible(evento.eventDate)} · {evento.locality}
          </span>
          <span style={{
            fontSize: 12,
            color: evento.isActive ? "#86efac" : "#facc15",
          }}>
            {evento.isActive ? "Activa" : "Desactivada"}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={boton} onClick={() => editar(evento)}>
              Editar
            </button>
            <button type="button" style={boton}
              onClick={() => void cambiarEstado(evento)}>
              {evento.isActive ? "Desactivar" : "Activar"}
            </button>
            <button type="button" style={{
              ...boton,
              background: "linear-gradient(180deg,#a52636,#681827)",
              borderColor: "#e34c5d",
            }} onClick={() => void eliminar(evento)}>
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}