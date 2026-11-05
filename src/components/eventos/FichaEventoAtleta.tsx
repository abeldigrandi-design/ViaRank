import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function FichaEventoAtleta({ children }: Props) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 90% 0%, #195d90 0%, #103d66 30%, #071b32 75%)",
        border: "1px solid #249fff",
        borderRadius: 22,
        padding: "18px",
        color: "#e1f3ff",
        boxShadow:
          "0 8px 28px rgba(0,0,0,.35), 0 0 22px rgba(20,140,255,.2), inset 0 1px 0 rgba(180,225,255,.2)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -70,
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "rgba(32,170,255,.1)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </section>
  );
}
