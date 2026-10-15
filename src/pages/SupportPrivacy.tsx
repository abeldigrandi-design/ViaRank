import viarankLogo from "../assets/viarank-header-logo-clean.png";
import { useLocation, useNavigate } from "react-router-dom";

const sections = [
  {
    title: "1. Introducción",
    paragraphs: [
      "ViaRank es una aplicación para registrar, validar y consultar actividades deportivas, participar en grupos y rankings, organizar eventos y utilizar las funciones disponibles de viajes y turismo.",
      "Esta política explica qué información personal tratamos, para qué la utilizamos, con quién puede compartirse y cómo ejercer los derechos sobre esos datos.",
    ],
  },
  {
    title: "2. Datos que tratamos",
    paragraphs: [
      "Perfil y cuenta: nombre, apellido, correo electrónico, sexo declarado, foto de perfil, ciudad y país cuando corresponda, identificadores de usuario y datos necesarios para mantener la sesión. El PIN se guarda mediante un hash, no como texto legible.",
      "Actividad deportiva: deporte, nombre de la actividad, fecha, horarios, duración, distancia, velocidad, desnivel y otras estadísticas autorizadas por el usuario o generadas por la aplicación.",
      "Ubicación y recorridos: datos que resulten necesarios para las funciones de registro de actividad y que el usuario autorice, o que reciba ViaRank de una fuente deportiva conectada.",
      "Participación: grupos, membresías, rankings, eventos y posibles coincidencias entre actividades. Si el usuario utiliza funciones de viajes, también se tratará la información necesaria para solicitudes o reservas.",
      "Información técnica: datos necesarios para operar, proteger y diagnosticar los servicios, que pueden incluir registros de acceso y errores.",
    ],
  },
  {
    title: "3. Para qué utilizamos los datos",
    paragraphs: [
      "Utilizamos la información para registrar y autenticar usuarios, mantener sus perfiles, importar o registrar actividades, calcular estadísticas, mostrar rankings dentro de grupos, administrar eventos y gestionar las funciones de viajes disponibles.",
      "También podemos comparar fechas y horarios de actividades para señalar posibles duplicaciones o superposiciones y evitar que una misma actividad se contabilice dos veces.",
    ],
  },
  {
    title: "4. Strava y otras fuentes deportivas",
    paragraphs: [
      "Strava: el usuario puede conectar voluntariamente su cuenta mediante la autorización de Strava. ViaRank recibe únicamente la información permitida para ofrecer estadísticas, actividades y rankings; no solicita la contraseña de Strava. La autorización puede revocarse desde las aplicaciones conectadas de Strava.",
      "Health Connect de Android: ViaRank contempla la integración con Health Connect. Cuando esté habilitada, solicitará los permisos específicos necesarios para acceder a los datos de actividad física que el usuario decida compartir. Los permisos pueden administrarse o revocarse desde Android. Los datos obtenidos de Health Connect no se venden ni se utilizan para publicidad personalizada.",
      "iGPSPORT, Garmin Connect y otras plataformas: son integraciones previstas para futuras versiones. No se presentan como servicios disponibles hasta que se implementen. Cualquier nueva conexión requerirá las autorizaciones correspondientes y, cuando sea necesario, una actualización de esta política.",
      "Desconectar una fuente puede impedir futuras importaciones, pero no necesariamente elimina las actividades ya almacenadas en ViaRank. Para eliminarlas, el usuario puede solicitar la eliminación de su cuenta o escribir al correo de contacto.",
    ],
  },
  {
    title: "5. Grupos, rankings y visibilidad",
    paragraphs: [
      "Los integrantes y administradores de los grupos en los que participa un atleta pueden ver la información necesaria para los rankings, como nombre, fotografía, kilómetros, posición y estadísticas deportivas. Los administradores pueden revisar avisos de posibles actividades superpuestas.",
      "ViaRank no presenta un ranking global de todos los usuarios: la comparación deportiva se realiza dentro de los grupos correspondientes, públicos o privados.",
    ],
  },
  {
    title: "6. Ubicación y recorridos",
    paragraphs: [
      "Las funciones que registran actividades mediante GPS pueden necesitar acceso a la ubicación del dispositivo. Se solicitarán los permisos que correspondan y el usuario podrá administrarlos desde la configuración del dispositivo.",
      "Las actividades importadas también pueden contener información de recorridos, según los datos compartidos por la plataforma de origen y los permisos otorgados.",
    ],
  },
  {
    title: "7. Eventos, viajes y reservas",
    paragraphs: [
      "ViaRank puede permitir la organización de eventos y la publicación o consulta de viajes. Si un usuario solicita o reserva una actividad, los datos necesarios para gestionarla podrán estar disponibles para el organizador o empresa correspondiente, únicamente con esa finalidad.",
    ],
  },
  {
    title: "8. Proveedores y comunicación de datos",
    paragraphs: [
      "ViaRank utiliza servicios de infraestructura, incluido Render para el alojamiento de la aplicación y sus servicios, y Strava cuando el usuario autoriza su conexión. Cada proveedor puede tratar los datos necesarios para prestar su servicio conforme a sus propias políticas.",
      "La información visible en grupos o necesaria para gestionar eventos y reservas puede ser consultada por los participantes o responsables autorizados, según la función utilizada. También puede comunicarse información cuando exista una obligación legal aplicable.",
    ],
  },
  {
    title: "9. Seguridad",
    paragraphs: [
      "ViaRank utiliza autenticación y controles de acceso según los permisos de cada cuenta. Los PIN se almacenan mediante un hash, no como texto legible. Ningún sistema informático puede garantizar una seguridad absoluta.",
    ],
  },
  {
    title: "10. Conservación de datos",
    paragraphs: [
      "Los datos de cuenta y actividad se conservan mientras sean necesarios para prestar las funciones de ViaRank y la cuenta permanezca activa, salvo que exista otra razón legal u operativa válida para conservar información específica.",
      "Al eliminar una cuenta se suprimen los datos asociados conforme al procedimiento implementado. Determinados registros técnicos, respaldos o datos sujetos a obligaciones legales pueden requerir un tratamiento o período de conservación diferente.",
    ],
  },
  {
    title: "11. Eliminación de cuenta y datos",
    paragraphs: [
      "Un usuario con sesión iniciada puede utilizar el botón «Eliminar mi cuenta» de esta página. La eliminación comprende su cuenta, actividades y membresías conforme al funcionamiento de ViaRank. Si administra grupos, también se eliminarán esos grupos y sus membresías. La acción es irreversible.",
      "Quien no pueda iniciar sesión puede solicitar la eliminación escribiendo a viarank.app@gmail.com con el asunto «Solicitud de eliminación de cuenta ViaRank». Podremos solicitar una verificación razonable de titularidad para evitar eliminaciones no autorizadas.",
    ],
  },
  {
    title: "12. Derechos y consultas",
    paragraphs: [
      "El usuario puede consultar sobre sus datos, solicitar la corrección de información inexacta o pedir la eliminación de su cuenta escribiendo a viarank.app@gmail.com. Las solicitudes se atenderán conforme a la legislación aplicable, incluida la normativa argentina de protección de datos personales.",
    ],
  },
  {
    title: "13. Menores de edad",
    paragraphs: [
      "ViaRank no está diseñada específicamente para niños. El uso por menores deberá respetar los requisitos legales y las autorizaciones que correspondan.",
    ],
  },
  {
    title: "14. Cambios de esta política",
    paragraphs: [
      "Podremos actualizar esta política cuando cambien las funcionalidades, los tratamientos de datos o los requisitos legales. La versión vigente se publicará en esta página con su fecha de actualización.",
    ],
  },
  {
    title: "15. Responsable y contacto",
    paragraphs: [
      "Titular y desarrollador: AJD. Aplicación: ViaRank. País: Argentina. Correo: viarank.app@gmail.com. Sitio web: https://viarank-1.onrender.com.",
    ],
  },
];

export default function SupportPrivacy() {
  const navigate = useNavigate();
  const location = useLocation();

  const eliminarCuenta = async () => {
    const confirmacion = window.confirm(
      "¿Seguro que querés eliminar tu cuenta? Esta acción eliminará permanentemente tu cuenta, tus actividades, tus membresías y los grupos que administrás."
    );
    if (!confirmacion) return;

    const confirmacionFinal = window.confirm(
      "Esta acción no se puede deshacer. ¿Querés continuar con la eliminación definitiva?"
    );
    if (!confirmacionFinal) return;

    try {
      const token = localStorage.getItem("viarank_auth_token");
      if (!token) {
        alert("Para eliminar tu cuenta desde la aplicación, primero debés iniciar sesión. Si no podés ingresar, escribí a viarank.app@gmail.com.");
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar la cuenta");
      }

      localStorage.removeItem("viarank_auth_token");
      alert("Tu cuenta y tus datos fueron eliminados permanentemente.");
      navigate("/");
    } catch (error) {
      console.error("Error eliminando cuenta:", error);
      alert("Ocurrió un error al eliminar la cuenta. Intentá nuevamente.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#071a33", padding: "24px 16px 48px", fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#ffffff" }}>
      <div style={{ width: "100%", maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ background: "#111827", borderRadius: "18px", padding: "20px", marginBottom: "18px" }}>
          <img src={viarankLogo} alt="ViaRank" style={{ width: "150px", maxWidth: "55%", height: "auto", display: "block" }} />
        </div>
        <main style={{ background: "#102b4c", borderRadius: "18px", padding: "24px", boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)" }}>
          <button type="button" onClick={() => navigate("/", { state: { internalReturn: true, user: location.state?.user } })} style={{ border: "none", background: "#071a33", borderRadius: "10px", padding: "9px 14px", cursor: "pointer", fontWeight: 700, color: "#ffffff", marginBottom: "22px" }}>
            ← Volver a ViaRank
          </button>
          <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>Soporte y privacidad</h1>
          <p style={{ margin: "0 0 24px", color: "#b8cde5", lineHeight: 1.6 }}>Política de Privacidad de ViaRank. Última actualización: 14 de octubre de 2026.</p>
          <section style={{ marginBottom: "30px" }}>
            <h2 style={{ fontSize: "20px" }}>Soporte</h2>
            <p style={{ lineHeight: 1.7, color: "#d1e2f5" }}>Si necesitás ayuda con ViaRank, las conexiones deportivas o tus datos, escribinos por correo electrónico.</p>
            <a href="mailto:viarank.app@gmail.com" style={{ color: "#ea580c", fontWeight: 700, textDecoration: "none" }}>viarank.app@gmail.com</a>
            <p style={{ color: "#b8cde5" }}>Titular y desarrollador: <strong style={{ color: "#ffffff" }}>AJD</strong></p>
          </section>
          <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Política de Privacidad</h2>
          {sections.map((section) => (
            <section key={section.title} style={{ marginBottom: "26px" }}>
              <h3 style={{ fontSize: "19px", color: "#ffffff", marginBottom: "12px" }}>{section.title}</h3>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} style={{ lineHeight: 1.75, color: "#d1e2f5", marginBottom: "12px" }}>{paragraph}</p>
              ))}
            </section>
          ))}
          <section style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #148cff" }}>
            <h2 style={{ fontSize: "20px" }}>Eliminar mi cuenta</h2>
            <p style={{ lineHeight: 1.7, color: "#d1e2f5" }}>Si tenés una sesión iniciada, podés eliminar tu cuenta y sus datos con el siguiente botón.</p>
            <p style={{ lineHeight: 1.7, color: "#d1e2f5", fontWeight: 600 }}>Importante: si administrás grupos deportivos, al eliminar tu cuenta también se eliminarán esos grupos y sus membresías. Esta acción no se puede deshacer.</p>
            <button type="button" onClick={eliminarCuenta} style={{ padding: "10px 16px", background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>Eliminar mi cuenta</button>
            <p style={{ lineHeight: 1.7, color: "#d1e2f5" }}>Si no podés iniciar sesión, solicitá la eliminación escribiendo a <a href="mailto:viarank.app@gmail.com?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20ViaRank" style={{ color: "#ea580c", fontWeight: 700 }}>viarank.app@gmail.com</a>.</p>
          </section>
          <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #148cff", color: "#94a3b8", fontSize: "13px", lineHeight: 1.6 }}>ViaRank es una aplicación independiente. Strava, Health Connect, iGPSPORT y Garmin son marcas de sus respectivos titulares.</div>
        </main>
      </div>
    </div>
  );
}
