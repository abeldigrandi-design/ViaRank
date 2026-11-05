import type { CSSProperties } from "react";

type Estado = "CONFIRMED" | "EVALUATING" | "SUSPENDED";

type Props = {
  status?: string | null;
  style?: CSSProperties;
  className?: string;
};

const estilos: Record<Estado, {
  texto: string;
  fondo: string;
  luz: string;
  letra: string;
}> = {
  CONFIRMED: {
    texto: "CONFIRMADO",
    fondo: "#24764C",
    luz: "#56E68B",
    letra: "#FFFFFF",
  },
  EVALUATING: {
    texto: "EN EVALUACIÓN",
    fondo: "#F5C518",
    luz: "#FFDF32",
    letra: "#302400",
  },
  SUSPENDED: {
    texto: "SUSPENDIDO",
    fondo: "#D51F32",
    luz: "#FF6868",
    letra: "#FFFFFF",
  },
};

export default function EstadoEvento({
  status,
  style,
  className,
}: Props) {
  const estado: Estado =
    status === "SUSPENDED" || status === "EVALUATING"
      ? status
      : "CONFIRMED";

  const actual = estilos[estado];

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px",
        borderRadius: 9,
        background: actual.fondo,
        border: "1px solid rgba(255,255,255,.28)",
        boxShadow:
          "inset 0 1px 2px rgba(255,255,255,.22), 0 2px 6px rgba(0,0,0,.25)",
        color: actual.letra,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: ".2px",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        ...style,
      }}
    >
      <style>{`
        @keyframes vr-luz-estado-evento {
          0%, 49.99% {
            opacity: 1;
            filter: brightness(1);
          }
          50%, 100% {
            opacity: 1;
            filter: brightness(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vr-luz-estado-evento {
            animation: none !important;
          }
        }
      `}</style>

      <span
        className="vr-luz-estado-evento"
        aria-hidden="true"
        style={{
          display: "inline-block",
          flexShrink: 0,
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: actual.luz,
          border: "1px solid rgba(255,255,255,.55)",
          boxShadow: `0 0 9px ${actual.luz}`,
          animation: "vr-luz-estado-evento 2s linear infinite",
        }}
      />

      <span>ESTADO: {actual.texto}</span>
    </span>
  );
}