type Evento = {
  title: string;
  eventDate: string;
  departureTime: string;
  meetingPlace: string;
  destination?: string | null;
  estimatedReturn?: string | null;
  plannedSpeed?: string | null;
  status?: string;
  rules?: string | null;
  organizer?: { firstName: string; lastName: string } | null;
  details?: {
    routeDescription?: string;
    distance?: number | null;
    elevation?: number | null;
    surface?: string;
    difficulty?: string;
    bicycleTypes?: string[];
    food?: string[];
    bringFood?: boolean;
    requiredEquipment?: string[];
    equipmentText?: string;
    disclaimer?: string;
  } | null;
};

type Props = {
  event: Evento;
  coverImage?: string;
  sport?: string;
  weather?: {
    temperature: number;
    precipitationProbability: number;
  } | null;
  weatherLoading?: boolean;
  onBack: () => void;
  onEdit?: () => void;
};

const panel: React.CSSProperties = {
  background: "linear-gradient(145deg,#10548c,#06284b)",
  border: "1px solid #178be7",
  borderRadius: 12,
  padding: 12,
  boxShadow: "inset 0 1px rgba(255,255,255,.16)"
};

function Dato({ icono, titulo, valor }: {
  icono: string; titulo: string; valor: string;
}) {
  return (
    <div style={{...panel, display:"flex", gap:9, alignItems:"center", minWidth:0}}>
      <span style={{fontSize:24}}>{icono}</span>
      <div style={{minWidth:0}}>
        <div style={{fontSize:10,color:"#8edcff",fontWeight:800}}>{titulo}</div>
        <div style={{fontSize:13,fontWeight:700,overflowWrap:"anywhere"}}>{valor}</div>
      </div>
    </div>
  );
}

export default function FichaInscripcionEvento({
  event, coverImage, sport, weather, weatherLoading, onBack, onEdit
}: Props) {
  const d = event.details;
  const estado = event.status || "CONFIRMED";
  const estados = [
    {id:"CONFIRMED",label:"Confirmado",color:"#20e778"},
    {id:"EVALUATING",label:"En evaluación",color:"#ffcf30"},
    {id:"SUSPENDED",label:"Suspendido",color:"#ff4b60"}
  ];

  const fecha = new Date(event.eventDate);
  const fechaTexto = isNaN(fecha.getTime())
    ? event.eventDate.substring(0,10)
    : fecha.toLocaleDateString("es-AR", {timeZone:"UTC"});

  const equipo = [
    ...(d?.requiredEquipment || []),
    ...(d?.equipmentText ? [d.equipmentText] : [])
  ];

  const fechaCompacta = fechaTexto + " · " + event.departureTime;
  const organizador = event.organizer
    ? `${event.organizer.firstName} ${event.organizer.lastName}`
    : "Organizador del grupo";

  const tarjeta: React.CSSProperties = {
    background:"linear-gradient(145deg,#14639d,#07345e)",
    border:"1px solid #1689d8",
    borderRadius:11,
    padding:"10px 11px",
    minWidth:0
  };

  const dato = (titulo:string, valor:string, icono:string) => (
    <div style={{...tarjeta,display:"flex",gap:8,alignItems:"center"}}>
      <span style={{fontSize:22}}>{icono}</span>
      <div style={{minWidth:0}}>
        <div style={{fontSize:10,fontWeight:800,color:"#79d8ff"}}>{titulo}</div>
        <div style={{fontSize:12,fontWeight:750,overflowWrap:"anywhere"}}>{valor || "No informado"}</div>
      </div>
    </div>
  );

  return (
    <section style={{
      color:"#fff",
      background:"radial-gradient(ellipse at 15% 15%,#137ac0 0%,transparent 48%),linear-gradient(155deg,#104d85,#073158 65%,#0a5793)",
      border:"1px solid #168be5",
      borderRadius:16,
      overflow:"hidden",
      boxShadow:"0 10px 28px #0006"
    }}>
      <div style={{height:210,position:"relative",background:"#103a60"}}>
        {coverImage && <img src={coverImage} alt="Portada del evento"
          style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(180deg,#00172b77 0%,transparent 30%,#00152fee 100%)"}}/>

        <button type="button" onClick={onBack}
          style={{position:"absolute",top:12,left:12,zIndex:2,
            background:"#052e55d9",border:"1px solid #6bc9ff",
            color:"#fff",borderRadius:9,padding:"7px 12px",cursor:"pointer"}}>
          ‹ Volver
        </button>

        <div style={{position:"absolute",top:12,right:12,
          background:"#06233de8",border:"1px solid #4c9bd0",
          borderRadius:10,padding:"7px 10px"}}>
          {estados.map(e => (
            <div key={e.id} style={{display:"flex",alignItems:"center",gap:6,
              color:estado===e.id?e.color:"#8295a5",
              fontWeight:estado===e.id?800:500,fontSize:11,margin:"3px 0"}}>
              <span style={{width:10,height:10,borderRadius:"50%",
                background:e.color,opacity:estado===e.id?1:.25,
                boxShadow:estado===e.id?`0 0 10px ${e.color}`:"none"}}/>
              {e.label}
            </div>
          ))}
        </div>

        <div style={{position:"absolute",left:15,right:12,bottom:14}}>
          <div style={{fontSize:32,fontWeight:900,textShadow:"0 2px 7px #000"}}>
            {event.title}
          </div>
          <div style={{fontSize:12,fontStyle:"italic",fontWeight:700}}>
            ¡Compartimos experiencias, hacemos amigos!
          </div>
        </div>
      </div>
      <div style={{padding:12,display:"grid",gap:10}}>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(3,minmax(0,1fr))",
          gap:5,
          padding:"12px 5px",
          borderRadius:12,
          border:"1px solid #42cfff",
          background:"linear-gradient(150deg,#156da9,#06325d)",
          boxShadow:"inset 0 2px 12px #4bd8ff35,0 4px 18px #001d3d"
        }}>
          <div style={{textAlign:"center",minWidth:0}}>
            <div style={{fontSize:24}}>📅</div>
            <div style={{fontSize:10,color:"#aeeaff"}}>FECHA</div>
            <strong style={{fontSize:14}}>{fechaTexto}</strong>
          </div>
          <div style={{textAlign:"center",minWidth:0,borderLeft:"1px solid #49b8ec",borderRight:"1px solid #49b8ec"}}>
            <div style={{fontSize:24}}>🕒</div>
            <div style={{fontSize:10,color:"#aeeaff"}}>SALIDA</div>
            <strong style={{fontSize:17}}>{event.departureTime}</strong>
          </div>
          <div style={{textAlign:"center",minWidth:0}}>
            <div style={{fontSize:24}}>🌤️</div>
            <div style={{fontSize:10,color:"#aeeaff"}}>CLIMA</div>
            <strong style={{fontSize:13}}>
              {weatherLoading ? "Consultando..." :
               weather ? `${weather.temperature} °C` : "No disponible"}
            </strong>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
          {dato("ENCUENTRO",event.meetingPlace,"📍")}
          {dato("DESTINO",event.destination || "No informado","🏁")}
          {dato("REGRESO",event.estimatedReturn || "No informado","↩️")}
          {dato("VELOCIDAD PREVISTA",event.plannedSpeed || "No informada","⚡")}
        </div>

        {(d?.routeDescription || d?.distance != null || d?.elevation != null ||
          d?.surface || d?.difficulty) && (
          <div style={tarjeta}>
            <strong style={{color:"#86dcff"}}>🗺️ Recorrido</strong>
            {d?.routeDescription && <div style={{fontSize:12,marginTop:5}}>{d.routeDescription}</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:"5px 12px",fontSize:12,marginTop:6}}>
              {d?.distance != null && <span>📏 {d.distance} km</span>}
              {d?.elevation != null && <span>⛰️ {d.elevation} m</span>}
              {d?.surface && <span>🛣️ {d.surface}</span>}
              {d?.difficulty && <span>📊 {d.difficulty}</span>}
            </div>
          </div>
        )}

        {equipo.length > 0 && (
          <div style={tarjeta}>
            <strong style={{color:"#86dcff"}}>🪖 Equipamiento obligatorio</strong>
            <div style={{fontSize:12,marginTop:5}}>{equipo.join(" · ")}</div>
          </div>
        )}

        {(d?.food?.length || d?.bringFood) && (
          <div style={tarjeta}>
            <strong style={{color:"#86dcff"}}>🍽️ Alimentación</strong>
            <div style={{fontSize:12,marginTop:5}}>
              {[...(d?.food || []),...(d?.bringFood?["Llevar comida"]:[])].join(" · ")}
            </div>
          </div>
        )}

        <div style={{fontSize:12,color:"#b8dcf4"}}>
          Organiza: <strong style={{color:"#fff"}}>{organizador}</strong>
          {sport && <span> · {sport}</span>}
        </div>

        {event.rules && (
          <div style={tarjeta}>
            <strong style={{color:"#86dcff"}}>📋 Normas del grupo</strong>
            <div style={{fontSize:12,marginTop:5,whiteSpace:"pre-wrap"}}>{event.rules}</div>
          </div>
        )}

        <div style={{...tarjeta,textAlign:"center",display:onEdit ? "none" : undefined}}>
          <strong style={{color:"#86dcff"}}>👥 Participantes</strong>
          <div style={{fontSize:12,color:"#c3d9ec",marginTop:5}}>
            La lista aparecerá al habilitar las inscripciones.
          </div>
        </div>

        {!onEdit && d?.disclaimer && (
          <details style={tarjeta}>
            <summary style={{cursor:"pointer",fontWeight:800,color:"#ffbd63"}}>
              📄 Condiciones y responsabilidad
            </summary>
            <div style={{fontSize:12,whiteSpace:"pre-wrap",marginTop:8}}>
              {d.disclaimer}
            </div>
          </details>
        )}

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            style={{
              alignSelf:"center",
              width:"auto",
              minWidth:145,
              padding:"7px 16px",
              borderRadius:9,
              border:"1px solid #39b9f4",
              background:"#125486",
              color:"#ffffff",
              fontSize:12,
              fontWeight:800,
              cursor:"pointer"
            }}
          >
            ✏️ EDITAR EVENTO
          </button>
        ) : (
          <button
            type="button"
            disabled
            style={{
              border:"1px solid #ffcf70",
              borderRadius:35,
              padding:"9px 12px",
              background:"linear-gradient(180deg,#ffe05b 0%,#ff9d00 28%,#ff5900 100%)",
              color:"#fff",
              fontWeight:900,
              fontSize:14,
              opacity:1,boxShadow:"inset 0 2px 3px #ffffff80,0 4px 14px #ff780055"
            }}
          >
            SUMARME A LA SALIDA ›
          </button>
        )}
        <div style={{textAlign:"center",fontSize:11,color:"#bddaf0",display:onEdit ? "none" : undefined}}>
          Inscripciones próximamente
        </div>
      </div>
    </section>
  );
}