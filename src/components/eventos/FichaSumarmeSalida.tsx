import EstadoEvento from "./EstadoEvento";
import { useEffect, useState } from "react";

type Evento = {
  id?: string;
  groupId?: string;
  title?: string;
  eventDate?: string;
  departureTime?: string;
  meetingPlace?: string;
  destination?: string | null;
  estimatedReturn?: string | null;
  plannedSpeed?: string | null;
  status?: string;
  rules?: string | null;
  organizer?: {
    firstName?: string;
    lastName?: string;
  } | null;
  details?: {
    routeDescription?: string;
    distance?: number | null;
    elevation?: number | null;
    surface?: string;
    difficulty?: string;
    food?: string[];
    foodTimes?: Record<string, string>;
    bringFood?: boolean;
    bringFoodOption?: "RECOMMENDED" | "NOT_PLANNED" | "OPTIONAL" | "";
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
    weatherCode?: number;
    windSpeed?: number;
    windGusts?: number;
    windDirection?: number;
  } | null;
  weatherLoading?: boolean;
  onBack: () => void;
  onEdit?: () => void;
};

const css = `
.vrb {
  --cyan:#03c9ff;
  --blue:#007bd5;
  color:#fff;
  width:100%;
  max-width:1020px;
  margin:0 auto;
  overflow:hidden;
  border-radius:22px;
  border:1px solid #0b76b9;
  background:
    radial-gradient(ellipse at 95% 95%,#086fc344,transparent 38%),
    radial-gradient(ellipse at 5% 55%,#0473a52a,transparent 45%),
    linear-gradient(180deg,#031c3d,#00234b 65%,#001632);
  box-shadow:0 15px 50px #00112299;
  font-family:inherit;
}
.vrb * {box-sizing:border-box}
.vrb button {font:inherit;cursor:pointer}
.vrb-head {
  height:72px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 24px;
  background:linear-gradient(100deg,#00224d,#03427c,#001b3a);
}
.vrb-back {
  color:#fff;
  border:0;
  background:transparent;
  font-size:34px!important;
  line-height:1;
}
.vrb-brand {
  font-size:30px;
  font-weight:1000;
  font-style:italic;
  letter-spacing:-1.5px;
  text-shadow:0 2px 8px #0008;
}
.vrb-brand span {color:#ffae00}
.vrb-head-space {width:42px}
.vrb-hero {
  position:relative;
  height:330px;
  background:linear-gradient(120deg,#0a548e,#04284d);
}
.vrb-hero img {
  display:block;
  width:100%;
  height:100%;
  object-fit:cover;
}
.vrb-hero:after {
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(180deg,#00183133,transparent 30%,#00152bdd 100%);
  pointer-events:none;
}
.vrb-status {
  position:absolute;
  z-index:2;
  right:22px;
  top:18px;
  display:flex;
  gap:12px;
  align-items:center;
  padding:11px 19px;
  border-radius:40px;
  background:#003321ed;
  border:1px solid #13d578;
  font-weight:900;
  font-size:16px;
  box-shadow:0 0 18px #03e77633;
}
.vrb-status-dot {
  width:13px;
  height:13px;
  border-radius:50%;
  background:var(--status-color);
  box-shadow:0 0 13px var(--status-color);
}
.vrb-hero-copy {
  position:absolute;
  z-index:2;
  left:28px;
  right:20px;
  bottom:24px;
}
.vrb-hero h1 {
  margin:0;
  font-size:clamp(42px,7vw,76px);
  line-height:1;
  font-weight:1000;
  font-style:italic;
  text-shadow:0 4px 10px #0009;
}
.vrb-hero p {
  margin:12px 0 0;
  font-size:clamp(15px,2.7vw,24px);
  font-weight:850;
  font-style:italic;
  text-shadow:0 2px 8px #000b;
}
.vrb-body {padding:0 22px 24px}
.vrb-highlight {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:0;
  margin-top:-1px;
  border:1px solid var(--cyan);
  border-radius:19px;
  background:linear-gradient(120deg,#064c87,#00234d 55%,#075c94);
  box-shadow:inset 0 0 16px #00aaff55,0 0 12px #00baff22;
  overflow:hidden;
}
.vrb-highlight-cell {
  display:flex;
  align-items:center;
  gap:20px;
  min-width:0;
  padding:21px 24px;
}
.vrb-highlight-cell + .vrb-highlight-cell {
  border-left:1px solid #06bdf0;
}
.vrb-giant {font-size:49px;flex-shrink:0;line-height:1}
.vrb-highlight strong {
  font-size:clamp(19px,3.2vw,32px);
  line-height:1.25;
  display:block;
}
.vrb-highlight small {
  display:block;
  font-size:16px;
  color:#d3efff;
  margin-bottom:4px;
}
.vrb-grid3 {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:11px;
  margin-top:11px;
}
.vrb-grid2 {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:11px;
  margin-top:11px;
}
.vrb-tile {
  min-width:0;
  border:1px solid #078cdb;
  border-radius:15px;
  background:linear-gradient(130deg,#054b80,#00244b 75%,#06467a);
  box-shadow:inset 0 0 12px #008fdb22;
  padding:15px 17px;
}
.vrb-mini {
  display:flex;
  align-items:center;
  gap:15px;
  min-height:88px;
}
.vrb-icon {
  font-size:37px;
  flex-shrink:0;
  width:48px;
  text-align:center;
  filter:drop-shadow(0 3px 3px #0005);
}
.vrb-kicker {
  display:block;
  color:#d6ecff;
  font-size:14px;
  margin-bottom:6px;
}
.vrb-value {
  display:block;
  font-size:clamp(16px,2.5vw,23px);
  font-weight:900;
  overflow-wrap:anywhere;
  line-height:1.3;
}
.vrb-line {
  margin-top:11px;
  display:flex;
  align-items:center;
  gap:20px;
  min-height:88px;
}
.vrb-line-main {flex:1;min-width:0}
.vrb-line h2 {
  margin:0 0 5px;
  font-size:21px;
  font-weight:900;
}
.vrb-line p {
  margin:0;
  font-size:16px;
  line-height:1.45;
  color:#e0f1ff;
  white-space:pre-wrap;
  overflow-wrap:anywhere;
}
.vrb-chevron {
  font-size:35px;
  color:#00c7ff;
  background:transparent;
  border:0;
  flex-shrink:0;
}
.vrb-tags {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin:9px 0;
}
.vrb-tag {
  padding:6px 10px;
  border:1px solid #128ed1;
  border-radius:9px;
  background:#06578b;
  font-size:14px;
  font-weight:800;
}
.vrb-participants {
  margin-top:11px;
  display:flex;
  align-items:center;
  gap:17px;
  min-height:95px;
}
.vrb-participants .vrb-line-main {width:100%}
.vrb-participants-row {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.vrb-subtle {color:#b7d9ee;font-size:14px}
.vrb-food {
  display:flex;
  align-items:center;
  gap:16px;
  min-height:100px;
}
.vrb-food .vrb-line-main {flex:1}
.vrb-read {
  flex-shrink:0;
  color:white;
  border:1px solid #ffd252;
  border-radius:12px;
  padding:10px 18px;
  background:linear-gradient(180deg,#ffbc31,#ff6a08);
  box-shadow:inset 0 2px 4px #fff7;
  font-weight:900!important;
}
.vrb-accept {
  display:flex;
  align-items:center;
  gap:14px;
  padding:16px 10px;
  font-size:17px;
  font-weight:700;
  cursor:pointer;
}
.vrb-accept input {
  width:25px;
  height:25px;
  flex-shrink:0;
  accent-color:#079eff;
}
.vrb-footer {
  padding:6px 10px 18px;
  text-align:center;
  position:relative;
}
.vrb-join {
  width:min(100%,580px);
  padding:16px;
  color:white;
  border-radius:45px;
  border:2px solid #ffd153;
  background:linear-gradient(180deg,#ffb527,#ff770a 45%,#ff4a0a);
  box-shadow:inset 0 3px 5px #fff7,0 8px 24px #ff730044;
  font-size:21px!important;
  font-weight:1000!important;
  text-shadow:0 2px 3px #a53400;
}
.vrb-join:disabled {opacity:1;cursor:not-allowed}
.vrb-note {font-size:12px;color:#b9d5e8;margin:10px 0 0}
.vrb-waves {
  height:45px;
  margin:-10px -22px -24px;
  border-bottom:4px solid #09a9ff;
  border-radius:0 0 50% 50%;
  box-shadow:0 6px 13px #038bff88;
  pointer-events:none;
}
@media(max-width:680px) {
  .vrb {border-radius:12px}
  .vrb-head {height:57px;padding:8px 14px}
  .vrb-brand {font-size:23px}
  .vrb-hero {height:235px}
  .vrb-hero-copy {left:15px;bottom:18px}
  .vrb-status {right:10px;top:10px;font-size:12px;padding:8px 11px}
  .vrb-body {padding:0 9px 16px}
  .vrb-highlight-cell {padding:13px 9px;gap:8px}
  .vrb-giant {font-size:28px}
  .vrb-highlight strong {font-size:16px}
  .vrb-highlight small {font-size:12px}
  .vrb-grid3 {grid-template-columns:1fr}
  .vrb-grid2 {grid-template-columns:1fr 1fr}
  .vrb-tile {padding:12px}
  .vrb-mini {min-height:65px;gap:8px}
  .vrb-icon {font-size:26px;width:30px}
  .vrb-kicker {font-size:12px}
  .vrb-value {font-size:16px}
  .vrb-line {gap:9px;min-height:70px}
  .vrb-line h2 {font-size:17px}
  .vrb-line p {font-size:14px}
  .vrb-food {gap:8px}
  .vrb-read {padding:9px;font-size:13px!important}
  .vrb-accept {font-size:14px}
  .vrb-join {font-size:16px!important}
  .vrb-waves {margin-left:-9px;margin-right:-9px}
}
`;

const ajustesLegibilidad = `
/* Ficha ViaRank: lectura clara en movil y escritorio */
.vrb {
  width:100%;
  min-width:0;
}
.vrb-body {
  width:100%;
  min-width:0;
}
.vrb-highlight {
  grid-template-columns:repeat(2,minmax(0,1fr));
}
.vrb-highlight-cell {
  min-width:0;
  padding:17px 14px;
  gap:12px;
}
.vrb-highlight strong {
  font-size:clamp(16px,2.2vw,25px);
  line-height:1.3;
  overflow-wrap:normal;
  word-break:normal;
}
.vrb-grid3 {
  grid-template-columns:repeat(3,minmax(0,1fr));
}
.vrb-grid2 {
  grid-template-columns:repeat(2,minmax(0,1fr));
}
.vrb-mini {
  align-items:center;
  min-width:0;
}
.vrb-mini > div {
  min-width:0;
  flex:1;
}
.vrb-value {
  font-size:clamp(15px,1.8vw,20px);
  overflow-wrap:normal;
  word-break:normal;
  hyphens:none;
}
.vrb-kicker {
  font-size:13px;
}
.vrb-icon {
  font-size:29px;
  width:34px;
}
@media(max-width:680px) {
  .vrb-grid3 {
    grid-template-columns:1fr;
  }
  .vrb-grid2 {
    grid-template-columns:1fr;
  }
  .vrb-mini {
    min-height:64px;
    padding:12px 15px;
  }
  .vrb-highlight-cell {
    padding:12px 9px;
    gap:8px;
  }
  .vrb-highlight strong {
    font-size:16px;
  }
  .vrb-giant {
    font-size:24px;
  }
  .vrb-value {
    font-size:17px;
  }
  .vrb-icon {
    font-size:26px;
    width:32px;
  }
}
`;
const ajusteFinalBoceto = `
/* Correccion de composicion del boceto */
.vrb-grid3 {
  display:grid !important;
  grid-template-columns:1fr !important;
  gap:9px !important;
}
.vrb-grid2 {
  display:grid !important;
  grid-template-columns:1fr !important;
  gap:9px !important;
}
.vrb-grid3 .vrb-mini,
.vrb-grid2 .vrb-mini {
  width:100% !important;
  min-height:70px !important;
  display:flex !important;
  align-items:center !important;
  gap:16px !important;
  padding:13px 18px !important;
}
.vrb-grid3 .vrb-mini > div,
.vrb-grid2 .vrb-mini > div {
  flex:1 !important;
  min-width:0 !important;
}
.vrb-grid3 .vrb-icon,
.vrb-grid2 .vrb-icon {
  flex:0 0 42px !important;
  width:42px !important;
  font-size:30px !important;
}
.vrb-grid3 .vrb-kicker,
.vrb-grid2 .vrb-kicker {
  font-size:13px !important;
  margin-bottom:4px !important;
}
.vrb-grid3 .vrb-value,
.vrb-grid2 .vrb-value {
  display:block !important;
  width:100% !important;
  font-size:20px !important;
  line-height:1.3 !important;
  overflow-wrap:break-word !important;
  word-break:normal !important;
  white-space:normal !important;
}
.vrb-highlight {
  grid-template-columns:1fr 1fr !important;
}
.vrb-highlight-cell {
  min-width:0 !important;
  gap:10px !important;
}
.vrb-highlight strong {
  font-size:clamp(15px,2vw,23px) !important;
  line-height:1.25 !important;
}
@media(max-width:480px) {
  .vrb-grid3 .vrb-value,
  .vrb-grid2 .vrb-value {
    font-size:17px !important;
  }
  .vrb-grid3 .vrb-mini,
  .vrb-grid2 .vrb-mini {
    padding:11px 13px !important;
  }
  .vrb-highlight-cell {
    padding:10px 7px !important;
  }
  .vrb-highlight strong {
    font-size:15px !important;
  }
}
`;
const ajusteAnchoFicha = `
.vrb {
  width:100% !important;
  max-width:1020px !important;
  min-width:0 !important;
  margin:0 auto !important;
  font-size:16px !important;
}
.vrb-body {
  width:100% !important;
  min-width:0 !important;
}
.vrb-grid3 .vrb-value,
.vrb-grid2 .vrb-value {
  font-size:18px !important;
}
.vrb-grid3 .vrb-kicker,
.vrb-grid2 .vrb-kicker {
  font-size:14px !important;
}
@media(min-width:700px) {
  .vrb-grid3 {
    grid-template-columns:repeat(3,minmax(0,1fr)) !important;
  }
  .vrb-grid2 {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  }
}
`;
const estiloCompacto = `
/* ViaRank: tarjetas bajas, lectura limpia y menos espacio vacio */
.vrb-body {
  padding-top:8px !important;
}
.vrb-grid3,
.vrb-grid2 {
  gap:7px !important;
  margin-top:7px !important;
}
.vrb-grid3 .vrb-mini,
.vrb-grid2 .vrb-mini {
  min-height:52px !important;
  padding:8px 13px !important;
  gap:11px !important;
}
.vrb-tile {
  border-radius:11px !important;
  padding:10px 13px !important;
}
.vrb-line,
.vrb-food,
.vrb-participants {
  min-height:58px !important;
  margin-top:7px !important;
  gap:12px !important;
}
.vrb-line h2,
.vrb-food h2,
.vrb-participants h2 {
  font-size:17px !important;
  margin:0 0 3px !important;
  line-height:1.2 !important;
}
.vrb-line p,
.vrb-food p,
.vrb-participants p {
  font-size:14px !important;
  line-height:1.35 !important;
}
.vrb-icon {
  font-size:23px !important;
  width:28px !important;
  flex:0 0 28px !important;
  filter:none !important;
}
.vrb-kicker {
  font-size:12px !important;
  margin-bottom:2px !important;
}
.vrb-value {
  font-size:16px !important;
  line-height:1.25 !important;
}
.vrb-read {
  padding:7px 12px !important;
  border-radius:9px !important;
  font-size:12px !important;
}
.vrb-chevron {
  font-size:23px !important;
}
.vrb-accept {
  padding:11px 8px !important;
  font-size:14px !important;
}
.vrb-join {
  padding:12px 16px !important;
  font-size:17px !important;
}
@media(max-width:680px) {
  .vrb-grid3 .vrb-mini,
  .vrb-grid2 .vrb-mini {
    min-height:49px !important;
    padding:8px 11px !important;
  }
  .vrb-tile {
    padding:9px 11px !important;
  }
  .vrb-line,
  .vrb-food,
  .vrb-participants {
    min-height:54px !important;
  }
}
`;
const estiloDatosCompactos = `
.vrb-seis-compactos {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:6px;
  margin-top:7px;
}
.vrb-celda64 {
  box-sizing:border-box;
  height:64px;
  min-height:64px;
  min-width:0;
  padding:5px 8px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:3px;
  overflow:hidden;
  border:1px solid #079cde;
  border-radius:9px;
  background:linear-gradient(115deg,#064c81,#00244b);
}
.vrb-celda-titulo {
  color:#bdeaff;
  font-size:11px;
  font-weight:700;
  line-height:1.1;
}
.vrb-celda-valor {
  color:white;
  font-size:13px;
  font-weight:850;
  line-height:1.15;
  display:flex;
  flex-wrap:wrap;
  column-gap:7px;
  row-gap:2px;
  overflow-wrap:anywhere;
}
.vrb-celda-extra {
  color:#d5efff;
  font-size:10px;
  line-height:1.1;
}
.vrb-equipo64 {
  margin-top:6px;
}
.vrb-equipo64 .vrb-dato-boton {
  box-sizing:border-box;
  height:42px;
  min-height:42px;
  padding:5px 10px;
}
.vrb-equipo64 .vrb-dato-simbolo {
  font-size:18px;
  width:22px;
  flex-basis:22px;
}
.vrb-equipo64 .vrb-dato-etiqueta {
  font-size:13px;
}
.vrb-equipo64 .vrb-dato-flecha {
  font-size:20px;
}
.vrb-datos-compactos {
  display:grid;
  grid-template-columns:1fr;
  gap:7px;
  margin-top:7px;
}
.vrb-dato-simple,
.vrb-dato-desplegable {
  width:100%;
  min-width:0;
  border:1px solid #078cdb;
  border-radius:11px;
  background:linear-gradient(115deg,#064c81,#00244b);
  overflow:hidden;
}
.vrb-dato-simple,
.vrb-dato-boton {
  display:flex;
  align-items:center;
  gap:12px;
  min-height:49px;
  padding:9px 15px;
}
.vrb-dato-boton {
  width:100%;
  border:0;
  background:transparent;
  color:#fff;
  text-align:left;
}
.vrb-dato-simbolo {
  width:26px;
  flex:0 0 26px;
  font-size:22px;
  text-align:center;
}
.vrb-dato-etiqueta {
  flex:1;
  min-width:0;
  font-size:15px;
  font-weight:700;
  color:#e5f6ff;
}
.vrb-dato-valor {
  font-size:18px;
  font-weight:900;
  color:white;
  white-space:nowrap;
}
.vrb-dato-flecha {
  font-size:24px;
  color:#40d4ff;
}
.vrb-dato-contenido {
  border-top:1px solid #127eb7;
  padding:11px 17px 13px 52px;
  font-size:14px;
  line-height:1.5;
}
.vrb-dato-contenido ul {
  margin:0;
  padding-left:17px;
}
.vrb-dato-contenido li {
  margin:4px 0;
}
.vrb-dato-contenido p {
  margin:0;
}
@media(max-width:480px) {
  .vrb-dato-simple,
  .vrb-dato-boton {
    padding:9px 11px;
    gap:9px;
  }
  .vrb-dato-etiqueta {font-size:13px}
  .vrb-dato-valor {font-size:16px}
  .vrb-dato-contenido {padding-left:38px}
}
`;
const estiloRecorridoTres = `
/* VIARANK-ORDEN-INFERIOR */
/* VIARANK-ICONOS-ILUSTRADOS-ESTILOS */
.vrb-icono-ilustrado { display:inline-block; width:26px; height:26px; flex:0 0 auto; object-fit:contain; vertical-align:middle; filter:drop-shadow(0 2px 2px #001b3780); }
.vrb-celda-titulo .vrb-icono-ilustrado { width:25px; height:25px; }
.vrb-recorrido-label .vrb-icono-ilustrado { width:28px; height:28px; }
.vrb-icono-pro .vrb-icono-ilustrado, .vrb-dato-simbolo .vrb-icono-ilustrado { width:36px; height:36px; }
.vrb-celda-titulo, .vrb-recorrido-label { gap:4px; }
.vrb-icono-pro, .vrb-dato-simbolo { display:inline-flex; align-items:center; justify-content:center; }
/* VIARANK-ICONOS-COLOR-2026 */
.vrb-celda-titulo svg,
.vrb-recorrido-label svg,
.vrb-icono-pro svg,
.vrb-dato-simbolo svg {
  padding:2px;
  box-sizing:content-box;
  border-radius:6px;
  background:linear-gradient(145deg,#ffffff20,#ffffff05);
  box-shadow:inset 0 1px 2px #ffffff25,0 2px 5px #0005;
}
.vrb-celda-titulo svg {
  width:19px;
  height:19px;
}
.vrb-recorrido-label svg {
  width:19px;
  height:19px;
}
.vrb-icono-pro svg,
.vrb-dato-simbolo svg {
  width:27px;
  height:27px;
}
.vrb-celda-titulo,
.vrb-recorrido-label {
  display:flex;
  align-items:center;
  gap:5px;
}
.vrb-celda-titulo svg {
  width:17px;
  height:17px;
}
.vrb-recorrido-label {
  justify-content:center;
  flex-wrap:wrap;
  gap:3px;
}
.vrb-recorrido-label svg {
  width:17px;
  height:17px;
}
.vrb-icono-pro svg {
  width:27px;
  height:27px;
}
.vrb-recorrido-nuevo {
  margin-top:8px;
  padding:8px;
  border-radius:11px;
  background:linear-gradient(135deg,#074c82,#00284f);
  border:1px solid #159fe4;
}
.vrb-recorrido-tres {
  gap:6px;
}
.vrb-recorrido-celda {
  border-radius:9px;
  background:linear-gradient(145deg,#116ba2,#073c70);
  border:1px solid #25b8f1;
}
.vrb-food {
  margin-top:7px;
  background:linear-gradient(120deg,#075783,#07345b);
  border:1px solid #1da9e6;
}
.vrb-participants {
  margin-top:7px;
  background:linear-gradient(120deg,#07518c,#032d55);
  border:1px solid #169de0;
}
.vrb-icono-pro {
  color:#85dfff;
  font-size:28px;
}
.vrb-equipo64 {
  margin-top:7px;
  background:linear-gradient(115deg,#07588b,#032b54);
  border-color:#169fe5;
}
@media(max-width:480px) {
  .vrb-recorrido-nuevo {padding:6px}
  .vrb-recorrido-tres {gap:5px}
  .vrb-food {padding:10px}
  .vrb-participants {padding:10px}
}
.vrb-recorrido-nuevo {
  margin-top:9px;
  padding:12px;
  border:1px solid #078fdf;
  border-radius:14px;
  background:linear-gradient(135deg,#064a80,#002a52);
  color:white;
}
.vrb-recorrido-titulo {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:10px;
  font-size:17px;
  font-weight:800;
}
.vrb-recorrido-expandir {
  width:29px;
  height:29px;
  border:1px solid #29baff;
  border-radius:8px;
  background:#064574;
  color:#58d9ff;
  font-size:21px;
  cursor:pointer;
}
.vrb-recorrido-tres {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px;
}
.vrb-recorrido-celda {
  min-width:0;
  min-height:69px;
  padding:11px 7px;
  border:1px solid #20a5e9;
  border-radius:10px;
  background:linear-gradient(150deg,#12659b,#06406e);
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
}
.vrb-recorrido-label {
  font-size:12px;
  font-weight:600;
  color:#b9eaff;
  line-height:1.2;
}
.vrb-recorrido-numero {
  font-size:16px;
  line-height:1.25;
  font-weight:850;
  color:#ffffff;
  overflow-wrap:anywhere;
}
.vrb-recorrido-detalle {
  margin-top:10px;
  padding:10px 12px;
  border-top:1px solid #268ac1;
  font-size:14px;
  line-height:1.5;
}
.vrb-recorrido-detalle p {
  margin:0;
}
@media(max-width:480px) {
  .vrb-recorrido-nuevo {padding:9px}
  .vrb-recorrido-tres {gap:5px}
  .vrb-recorrido-celda {padding:9px 4px;min-height:65px}
  .vrb-recorrido-label {font-size:11px}
  .vrb-recorrido-numero {font-size:13px}
}
`;
function Mostrar({ value }: { value?: string | number | null }) {
  return <>{value === null || value === undefined || value === ""
    ? "No informado"
    : value}</>;
}

/* VIARANK-ICONOS-PRO */
type NombreIconoVR =
  | "calendario" | "ubicacion" | "destino"
  | "clima" | "velocidad" | "llegada"
  | "recorrido" | "desnivel" | "terreno"
  | "comida" | "equipo" | "personas";

/* VIARANK-ICONOS-ILUSTRADOS */
function IconoVR({ nombre }: { nombre: NombreIconoVR }) {
  return (
    <img
      src={`/viarank-icons/${nombre}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="vrb-icono-ilustrado"
    />
  );
}
export default function FichaSumarmeSalida({
  event,
  coverImage,
  weather,
  weatherLoading,
  onBack
}: Props) {
  const [acepta, setAcepta] = useState(false);
  const [inscripto, setInscripto] = useState(false);
  const [consultando, setConsultando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeInscripcion, setMensajeInscripcion] = useState("");
  const [participantes, setParticipantes] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  }>>([]);
  const [cargandoParticipantes, setCargandoParticipantes] = useState(true);
  const [errorParticipantes, setErrorParticipantes] = useState("");

  const urlInscripcion = event.id && event.groupId
    ? `${import.meta.env.VITE_API_URL}/api/groups/${encodeURIComponent(event.groupId)}/events/${encodeURIComponent(event.id)}/registrations/me`
    : null;

  async function consultarParticipantesViaRank() {
    if (!urlInscripcion) {
      setCargandoParticipantes(false);
      return;
    }

    setCargandoParticipantes(true);
    setErrorParticipantes("");

    try {
      const token = localStorage.getItem("viarank_auth_token");
      const url = urlInscripcion.replace(/\/me$/, "");

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token ?? ""}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar a los participantes.");
      }

      setParticipantes(Array.isArray(data.participants) ? data.participants : []);
    } catch (error) {
      setErrorParticipantes(
        error instanceof Error ? error.message : "Error al consultar participantes."
      );
    } finally {
      setCargandoParticipantes(false);
    }
  }

  async function consultarInscripcionViaRank() {
    if (!urlInscripcion) {
      setMensajeInscripcion("Faltan datos del evento para inscribirse.");
      setConsultando(false);
      return;
    }

    setConsultando(true);
    try {
      const token = localStorage.getItem("viarank_auth_token");
      const response = await fetch(urlInscripcion, {
        headers: { Authorization: `Bearer ${token ?? ""}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo consultar la inscripción.");
      }

      setInscripto(Boolean(data.registered));
      setMensajeInscripcion("");
    } catch (error) {
      setMensajeInscripcion(
        error instanceof Error ? error.message : "Error al consultar la inscripción."
      );
    } finally {
      setConsultando(false);
    }
  }

  useEffect(() => {
    void consultarInscripcionViaRank();
    void consultarParticipantesViaRank();
  }, [urlInscripcion]);

  async function cambiarInscripcionViaRank() {
    if (!urlInscripcion || guardando || consultando) return;
    if (!inscripto && !acepta) return;

    setGuardando(true);
    setMensajeInscripcion("");

    try {
      const token = localStorage.getItem("viarank_auth_token");
      const response = await fetch(urlInscripcion, {
        method: inscripto ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json"
        },
        ...(inscripto ? {} : { body: JSON.stringify({ acceptedTerms: true }) })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar la inscripción.");
      }

      const ahoraInscripto = Boolean(data.registered);
      setInscripto(ahoraInscripto);
      setAcepta(false);
      void consultarParticipantesViaRank();
      setMensajeInscripcion(
        ahoraInscripto
          ? "¡Ya estás inscripto en esta salida!"
          : "Tu inscripción fue cancelada."
      );
    } catch (error) {
      setMensajeInscripcion(
        error instanceof Error ? error.message : "No se pudo completar la operación."
      );
    } finally {
      setGuardando(false);
    }
  }
  const [verNormas, setVerNormas] = useState(false);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const [verRecorrido, setVerRecorrido] = useState(false);
  const [verEquipamiento, setVerEquipamiento] = useState(false);

  const d = event.details;
  const fecha = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short"
      })
    : "Fecha pendiente";

  const estadoOriginal = String(event.status || "").toUpperCase();
  const suspendido = estadoOriginal.includes("SUSPEND");
  const confirmado = estadoOriginal.includes("CONFIRM");
  const estado = suspendido
    ? "SUSPENDIDO"
    : confirmado
      ? "CONFIRMADO"
      : "EN EVALUACIÓN";
  const colorEstado = suspendido
    ? "#ff4d65"
    : confirmado
      ? "#15f482"
      : "#ffce3a";

  const equipo = [
    ...(d?.requiredEquipment || []),
    ...(d?.equipmentText ? [d.equipmentText] : [])
  ].filter(Boolean);

  const alimentos = (d?.food || []).filter(Boolean);

  const clima = weatherLoading
    ? "Consultando..."
    : weather
      ? `${weather.temperature} °C`
      : "No disponible";

  const simboloClima = (codigo?: number) => {
    if (codigo === undefined) return "🌡️";
    if (codigo === 0) return "☀️";
    if ([1, 2].includes(codigo)) return "🌤️";
    if (codigo === 3) return "☁️";
    if ([45, 48].includes(codigo)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(codigo)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(codigo)) return "🌨️";
    if ([95, 96, 99].includes(codigo)) return "⛈️";
    return "🌥️";
  };
  const direccionViento = (grados?: number) => {
    if (typeof grados !== "number" || !Number.isFinite(grados)) {
      return "Sin datos";
    }

    const puntos = [
      "N (norte)",
      "NNE (nornoreste)",
      "NE (noreste)",
      "ENE (estenoreste)",
      "E (este)",
      "ESE (estesudeste)",
      "SE (sudeste)",
      "SSE (sudsudeste)",
      "S (sur)",
      "SSO (sudsudoeste)",
      "SO (sudoeste)",
      "OSO (oesudoeste)",
      "O (oeste)",
      "ONO (oesnoroeste)",
      "NO (noroeste)",
      "NNO (nornoroeste)"
    ];

    return puntos[Math.round(((grados % 360) + 360) % 360 / 22.5) % 16];
  };

  const comidaTexto = [
    ...alimentos.map(alimento => {
      const horario = d?.foodTimes?.[alimento];
      return horario ? `${alimento} · ${horario}` : alimento;
    }),
    ...(d?.bringFoodOption === "RECOMMENDED" ? ["Se recomienda llevar vianda"] : d?.bringFoodOption === "NOT_PLANNED" ? ["En esta salida no está previsto llevar vianda"] : d?.bringFoodOption === "OPTIONAL" || d?.bringFood ? ["Quien lo desee puede llevar vianda"] : [])
  ].join(" · ");

  return (
    <>
      <style>{`
        .vrb .vrb-join {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  max-width: 100% !important;
  height: 33px !important;
  min-height: 33px !important;
  padding: 1px 12px !important;
  box-sizing: border-box !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  line-height: 1.05 !important;
  white-space: nowrap !important;
  border-radius: 11px !important;
  border: 1px solid #7bffc0 !important;
  color: #ffffff !important;
  background: linear-gradient(180deg,#39e99a 0%,#0eac62 48%,#006b3c 100%);
  box-shadow:
    inset 0 2px 2px #ffffff80,
    inset 0 -2px 3px #003d2670,
    0 3px 0 #064a2b,
    0 5px 8px #0008 !important;
  text-shadow: 0 1px 2px #063b20;
  cursor: pointer;
}
        .vrb .vrb-join:disabled {
          opacity: .65 !important;
          cursor: not-allowed;
        }
        .vrb-lista-real-evento {
          margin: 14px 0 24px;
          padding: 16px;
          border: 1px solid #148cff;
          border-radius: 16px;
          background: linear-gradient(145deg,#123a63,#071b34);
          color: white;
          box-shadow: 0 5px 20px #0005;
        }
        .vrb-lista-real-evento h2 {
          margin: 0 0 12px;
          font-size: 17px;
          color: #d9f3ff;
        }
        .vrb-lista-real-evento ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .vrb-lista-real-evento li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-top: 1px solid #ffffff20;
          font-size: 14px;
        }
        .vrb-lista-real-evento .vrb-avatar-lista {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #1265a3;
          color: white;
          font-weight: 800;
          overflow: hidden;
        }
        .vrb-lista-real-evento .vrb-avatar-lista img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .vrb-lista-real-evento p {
          margin: 6px 0;
          font-size: 13px;
          color: #c5dff0;
        }
      `}</style>
      <article className="vrb" data-diseno="VIARANK-BOCETO-TANDIL">
      <style>{css + ajustesLegibilidad + ajusteFinalBoceto + ajusteAnchoFicha + estiloCompacto + estiloDatosCompactos + estiloRecorridoTres + `
/* Indicador luminoso ViaRank: tres estados */
.vrb-status-luminoso {
  animation: vrbPulsoEstado 3s ease-in-out infinite;
}
.vrb-status-luminoso > span:first-child > span {
  transition: opacity .3s ease, box-shadow .3s ease;
}
@keyframes vrbPulsoEstado {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.28); }
}
@media (prefers-reduced-motion: reduce) {
  .vrb-status-luminoso {
    animation: none !important;
  }
}` + `
/* ViaRank: flash luminoso visible cada 2,5 segundos */
.vrb-status-luminoso {
  animation: vrbFlashMarco 2.5s linear infinite;
}

.vrb-status-luminoso > span:first-child > span[style*="opacity: 1"] {
  animation: vrbFlashLuz 2.5s linear infinite;
}

@keyframes vrbFlashMarco {
  0%, 78%, 100% {
    filter: brightness(1);
  }
  83% {
    filter: brightness(2);
  }
  89% {
    filter: brightness(1);
  }
}

@keyframes vrbFlashLuz {
  0%, 78%, 100% {
    filter: brightness(1);
    transform: scale(1);
  }
  83% {
    filter: brightness(2.8);
    transform: scale(1.45);
  }
  89% {
    filter: brightness(1);
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vrb-status-luminoso,
  .vrb-status-luminoso > span:first-child > span {
    animation: none !important;
  }
}`}</style>
      <div className="vrb-hero">
        {coverImage && (
          <img src={coverImage} alt="Imagen de la salida" />
        )}

        <div className="vrb-hero-copy" style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:7,bottom:8}}>
          <h1>{event.title || "Salida del grupo"}</h1>
        <EstadoEvento status={event.status} />
                  {event.organizer && (event.organizer.firstName || event.organizer.lastName) && (
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:6,
              color:"#d8efff",
              fontSize:12,
              fontWeight:700,
              textShadow:"0 2px 5px #000"
            }}>
              <span aria-hidden="true">👤</span>
              <span>
                Organizado por: {`${event.organizer.firstName || ""} ${event.organizer.lastName || ""}`.trim()}
              </span>
            </div>
          )}
          
        </div>
      </div>

      <div className="vrb-body">

        <style>{`
  .vrb-seis-compactos .vrb-celda-ampliada {
    min-height: 112px;
    padding-top: 12px;
    padding-bottom: 12px;
    box-sizing: border-box;
  }

  .vrb-seis-compactos .vrb-celda-ampliada .vrb-celda-valor {
    line-height: 1.35;
  }
`}</style>
        <div className="vrb-seis-compactos">

          <div className="vrb-celda64 vrb-celda-ampliada">
            <span className="vrb-celda-titulo"><IconoVR nombre="calendario"/> Día y hora</span>
            <strong className="vrb-celda-valor">
              <span style={{textTransform:"capitalize"}}>{fecha}</span>
              <span><Mostrar value={event.departureTime}/> hs.</span>
            </strong>
          </div>

          <div className="vrb-celda64 vrb-celda-ampliada">
            <span className="vrb-celda-titulo"><IconoVR nombre="ubicacion"/> Lugar de encuentro</span>
            <strong className="vrb-celda-valor">
              <Mostrar value={event.meetingPlace}/>
            </strong>
          </div>

          <div className="vrb-celda64">
            <span className="vrb-celda-titulo"><IconoVR nombre="destino"/> Destino</span>
            <strong className="vrb-celda-valor">
              <Mostrar value={event.destination}/>
            </strong>
          </div>
          <div
            className="vrb-celda64"
            style={{
              height:"auto",
              minHeight:64,
              padding:"7px 8px",
              justifyContent:"flex-start",
              gap:5,
              gridColumn:1,
              gridRow:3,
              alignSelf:"start"
            }}
          >
            <span className="vrb-celda-titulo">
              <span aria-hidden="true" style={{fontSize:17}}>🧺</span>
              Comidas
            </span>
            <span style={{
              fontSize:12,
              color:"#e8f6ff",
              lineHeight:1.35,
              overflowWrap:"anywhere"
            }}>
              {comidaTexto || "No informada"}
            </span>
          </div>

          <div
  className="vrb-celda64"
  style={{
    gridColumn:2,
    gridRow:"2 / span 2",
    height:"auto",
    minHeight:125,
    padding:"8px",
    display:"flex",
    flexDirection:"column",
    justifyContent:"flex-start",
    gap:4
  }}
>
  <span className="vrb-celda-titulo">
    <IconoVR nombre="clima"/> Clima y vientos
  </span>

  {weather ? (
    <>
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:6,
        width:"100%",
        alignItems:"center",
        flex:1
      }}>
        <div style={{
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          gap:6,
          minWidth:0
        }}>
          <span
            aria-hidden="true"
            style={{fontSize:34,lineHeight:1}}
          >
            {simboloClima(weather.weatherCode)}
          </span>

          <strong style={{fontSize:18,color:"#fff",whiteSpace:"nowrap"}}>
            {weather.temperature} °C
          </strong>

          <span style={{fontSize:12,color:"#d5efff"}}>
            💧 {weather.precipitationProbability}%
          </span>
        </div>

        <div style={{
          display:"flex",
          flexDirection:"column",
          justifyContent:"center",
          gap:7,
          minWidth:0
        }}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span aria-hidden="true" style={{fontSize:19}}>💨</span>
            <div style={{minWidth:0}}>
              <span style={{display:"block",fontSize:10,color:"#acdfff"}}>
                Viento
              </span>
              <strong style={{fontSize:11,color:"#fff",whiteSpace:"nowrap"}}>
                {typeof weather.windSpeed === "number"
                  ? `${weather.windSpeed} km/h`
                  : "Sin datos"}
              </strong>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span aria-hidden="true" style={{fontSize:19}}>🌬️</span>
            <div style={{minWidth:0}}>
              <span style={{display:"block",fontSize:10,color:"#acdfff"}}>
                Ráfagas
              </span>
              <strong style={{fontSize:11,color:"#fff",whiteSpace:"nowrap"}}>
                {typeof weather.windGusts === "number"
                  ? `${weather.windGusts} km/h`
                  : "Sin datos"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        width:"100%",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        gap:6,
        fontSize:11,
        color:"#e2f5ff",
        padding:"4px 3px",
        borderRadius:7,
        background:"rgba(19,113,173,.38)"
      }}>
        <span aria-hidden="true" style={{fontSize:17}}>🧭</span>
        <span>Desde: {direccionViento(weather.windDirection)}</span>
      </div>
    </>
  ) : (
    <span style={{fontSize:12,color:"#c9edff"}}>
      {weatherLoading
        ? "Consultando pronóstico..."
        : "Pronóstico no disponible"}
    </span>
  )}
</div>
<div className="vrb-celda64">
            <span className="vrb-celda-titulo"><IconoVR nombre="velocidad"/> Velocidad propuesta</span>
            <strong className="vrb-celda-valor">
              <Mostrar value={event.plannedSpeed}/> km/h
            </strong>
          </div>

          <div className="vrb-celda64">
            <span className="vrb-celda-titulo"><IconoVR nombre="llegada"/> Regreso estimado</span>
            <strong className="vrb-celda-valor">
              <Mostrar value={event.estimatedReturn}/> hs.
            </strong>
          </div>

        </div>

                {(d?.distance != null ||
          d?.elevation != null ||
          !!d?.surface ||
          !!d?.routeDescription) && (
          <section className="vrb-recorrido-nuevo">

            

            <div className="vrb-recorrido-tres">

              <div className="vrb-recorrido-celda">
                <span className="vrb-recorrido-label">
                  <IconoVR nombre="recorrido"/> Recorrido
                </span>
                <strong className="vrb-recorrido-numero">
                  {d?.distance != null
                    ? `${d.distance} km`
                    : "Sin informar"}
                </strong>
              </div>

              <div className="vrb-recorrido-celda">
                <span className="vrb-recorrido-label">
                  <IconoVR nombre="desnivel"/> Desnivel
                </span>
                <strong className="vrb-recorrido-numero">
                  {d?.elevation != null
                    ? `${d.elevation} m ↑`
                    : "Sin informar"}
                </strong>
              </div>

              <div className="vrb-recorrido-celda">
                <span className="vrb-recorrido-label">
                  <IconoVR nombre="terreno"/> Tipo de terreno
                </span>
                <strong className="vrb-recorrido-numero">
                  {d?.surface || "Sin informar"}
                </strong>
              </div>

            </div>

            {verRecorrido && (
              <div className="vrb-recorrido-detalle">
                {d?.routeDescription ? (
                  <p>{d.routeDescription}</p>
                ) : (
                  <p>No se agregó una descripción adicional.</p>
                )}
              </div>
            )}

          </section>
        )}



        <div className="vrb-dato-desplegable vrb-equipo64">
          <button
            type="button"
            className="vrb-dato-boton"
            onClick={() => setVerEquipamiento(!verEquipamiento)}
            aria-expanded={verEquipamiento}
          >
            <span className="vrb-dato-simbolo"><IconoVR nombre="equipo"/></span>
            <span className="vrb-dato-etiqueta">
              Equipamiento obligatorio
            </span>
            <span className="vrb-dato-flecha">
              {verEquipamiento ? "⌃" : "⌄"}
            </span>
          </button>

          {verEquipamiento && (
            <div className="vrb-dato-contenido">
              {equipo.length ? (
                <ul>
                  {equipo.map((elemento, indice) => (
                    <li key={indice}>{elemento}</li>
                  ))}
                </ul>
              ) : (
                <p>No se informó equipamiento obligatorio.</p>
              )}
            </div>
          )}
        </div>

        <section className="vrb-tile vrb-line">
          <span className="vrb-icon">📄</span>
          <div className="vrb-line-main">
            <h2>Normas del grupo</h2>
            {verNormas
              ? <p><Mostrar value={event.rules}/></p>
              : <p>Consultá las normas de esta salida.</p>}
          </div>
          <button className="vrb-chevron" type="button"
            aria-label="Leer normas"
            onClick={() => setVerNormas(!verNormas)}>
            {verNormas ? "⌃" : "⌄"}
          </button>
        </section>

        <section className="vrb-tile vrb-line">
          <span className="vrb-icon">📄</span>
          <div className="vrb-line-main">
            <h2>Condiciones y responsabilidad</h2>
            {verCondiciones
              ? <p><Mostrar value={d?.disclaimer}/></p>
              : <p>
                  Leé las condiciones antes de confirmar
                  tu participación.
                </p>}
          </div>
          <button className="vrb-read" type="button"
            onClick={() => setVerCondiciones(!verCondiciones)}>
            📖 {verCondiciones ? "Cerrar" : "Leer"}
          </button>
        </section>

        {!inscripto && (<label className="vrb-accept">
          <input type="checkbox"
            checked={acepta}
            onChange={e => setAcepta(e.target.checked)}
          />
          <span>
            Acepto las condiciones y la responsabilidad del evento.
          </span>
        </label>)}

        <footer className="vrb-footer">
          <button
            className="vrb-join"
            type="button"
            onClick={() => void cambiarInscripcionViaRank()}
            disabled={consultando || guardando || !urlInscripcion || (!inscripto && !acepta)}
            style={inscripto ? {
              background: "linear-gradient(180deg, #ec6868, #b51e2e)",
              borderColor: "#ff8a8a"
            } : undefined}
          >
            {guardando
              ? "PROCESANDO..."
              : consultando
                ? "CONSULTANDO..."
                : inscripto
                  ? "CANCELAR INSCRIPCIÓN"
                  : "👥 SUMARME A LA SALIDA"}
          </button>
          <p className="vrb-note" role="status">
            {mensajeInscripcion || (inscripto
              ? "Ya figurás como participante de esta salida."
              : "Aceptá las condiciones para inscribirte.")}
          </p>
        </footer>

        <div className="vrb-waves"/>
      </div>
    </article>

    <section className="vrb-lista-real-evento" aria-label="Participantes inscriptos">
      <h2>
        Participantes inscriptos ({participantes.length})
      </h2>

      {cargandoParticipantes ? (
        <p>Consultando participantes...</p>
      ) : errorParticipantes ? (
        <p role="alert">{errorParticipantes}</p>
      ) : participantes.length === 0 ? (
        <p>Todavía no hay participantes inscriptos.</p>
      ) : (
        <ul>
          {participantes.map((participante) => (
            <li key={participante.id}>
              <span className="vrb-avatar-lista">
                {participante.profilePicture?.startsWith("https://") ? (
                  <img
                    src={participante.profilePicture}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (participante.firstName?.[0] || "?").toUpperCase()
                )}
              </span>
              <span>
                {participante.firstName} {participante.lastName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
    </>
  );
}