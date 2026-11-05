type Props = {
  canCreateEvents: boolean;
  publicationStatus?: string | null;
  onPublish: () => void;
  onWhatsApp: () => void;
  onDetails: () => void;
  onDelete: () => void;
};

export default function BotonesEvento({ canCreateEvents, publicationStatus, onDetails }: Props) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
      <button type="button" onClick={onDetails} style={{ flex: 1, minHeight: 28, borderRadius: 7, border: "1px solid #8ce6ff", background: "linear-gradient(180deg,#289ff0,#0757ae)", color: "#fff", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
        {canCreateEvents ? "Editar evento" : "Ver detalles"}
      </button>
      {canCreateEvents && (
        <button type="button" aria-label="Ayuda sobre editar eventos" title="Ayuda" onClick={() => window.alert(publicationStatus === "PUBLISHED" ? "Un evento publicado solo admite correcciones menores. Para cambios importantes, suspendé el evento original con el semáforo rojo y creá otro." : "Los borradores se pueden editar y publicar desde el formulario. No son visibles para los atletas.")} style={{ width: 27, height: 27, borderRadius: "50%", border: "1px solid #39a9e9", background: "#103a60", color: "#b8eaff", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>?</button>
      )}
    </div>
  );
}