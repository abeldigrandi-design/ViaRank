import type { CSSProperties } from "react";

type Estado = "CONFIRMED" | "EVALUATING" | "SUSPENDED";

type Props = {
  titulo: string;
  fecha: string;
  hora: string;
  destino: string;
  estado: Estado;
  guardando: boolean;
  error?: string;
  onEstadoChange: (estado: Estado) => void;
  onGuardar: () => void;
  onGuardarWhatsApp: () => void;
  onCancelar: () => void;
};

const estados: { valor: Estado; nombre: string; color: string }[] = [
  { valor: "CONFIRMED", nombre: "Confirmado", color: "#22c55e" },
  { valor: "EVALUATING", nombre: "En evaluación", color: "#eab308" },
  { valor: "SUSPENDED", nombre: "Suspendido", color: "#ef4444" },
];

const botonAzul: CSSProperties = {
  width: "100%",
  height: 31,
  borderRadius: 10,
  border: "1px solid #60c7ff",
  background: "linear-gradient(180deg,#35baff,#126399 65%,#074371)",
  color: "#fff",
  fontWeight: 900,
  boxShadow: "inset 0 2px 2px #b4eaff,0 5px 10px #03172b",
  cursor: "pointer",
};

export default function EstadoEventoPublicado({
  titulo,
  fecha,
  hora,
  destino,
  estado,
  guardando,
  error,
  onEstadoChange,
  onGuardar,
  onGuardarWhatsApp,
  onCancelar,
}: Props) {
  const fechaVisible = /^\d{4}-\d{2}-\d{2}/.test(fecha)
    ? `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`
    : fecha;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h3 style={{ textAlign: "center", color: "#67caff", margin: 0 }}>
        Cambiar estado del evento
      </h3>

      <div style={{
        display: "grid",
        gap: 7,
        padding: 14,
        borderRadius: 12,
        border: "1px solid #2584c5",
        background: "#0b2944",
        color: "#fff",
      }}>
        <strong style={{ fontSize: 18 }}>{titulo}</strong>
        <span>Fecha: {fechaVisible}</span>
        <span>Hora: {hora}</span>
        <span>Destino: {destino || "Sin destino"}</span>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 18,
        alignItems: "center",
      }}>
        {estados.map((item) => (
          <button
            key={item.valor}
            type="button"
            disabled={guardando}
            onClick={() => onEstadoChange(item.valor)}
            title={item.nombre}
            aria-label={item.nombre}
            aria-pressed={estado === item.valor}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: item.color,
              border: estado === item.valor
                ? "3px solid #fff"
                : "2px solid #315a79",
              opacity: estado === item.valor ? 1 : 0.2,
              boxShadow: estado === item.valor
                ? `0 0 18px ${item.color}`
                : "none",
              cursor: guardando ? "wait" : "pointer",
            }}
          />
        ))}
      </div>

      <strong style={{ textAlign: "center", color: "#fff" }}>
        {estados.find((item) => item.valor === estado)?.nombre}
      </strong>

      {error && (
        <div role="alert" style={{ color: "#ffae54", fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={guardando}
        onClick={onGuardar}
        style={{ ...botonAzul, opacity: guardando ? 0.6 : 1 }}
      >
        {guardando ? "Guardando..." : "Guardar estado"}
      </button>

            <button
        type="button"
        disabled={guardando}
        onClick={onGuardarWhatsApp}
        style={{
          width: "100%",
          height: 31,
          borderRadius: 10,
          border: "1px solid #7affad",
          background: "linear-gradient(180deg,#40e989,#139e52 65%,#08713b)",
          color: "#fff",
          fontWeight: 900,
          boxShadow: "inset 0 2px 2px #c4ffdc,0 5px 10px #03172b",
          cursor: guardando ? "wait" : "pointer",
          opacity: guardando ? 0.6 : 1,
        }}
      >
        {guardando ? "Guardando..." : "Guardar y compartir por WhatsApp"}
      </button>
<button
        type="button"
        disabled={guardando}
        onClick={onCancelar}
        style={{
          height: 31,
          borderRadius: 9,
          border: "1px solid #315a79",
          background: "#0b2944",
          color: "#fff",
          fontWeight: 800,
        }}
      >
        Cancelar
      </button>

      <div style={{
        textAlign: "center",
        fontSize: 12,
        color: "#b9d0e3",
      }}>
        Para cambiar la fecha, el horario o el recorrido,
        suspendé este evento y creá uno nuevo.
      </div>
    </div>
  );
}
