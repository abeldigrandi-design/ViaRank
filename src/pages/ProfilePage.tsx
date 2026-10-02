import { useEffect, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import viarankHeaderLogo from "../assets/viarank-header-logo-clean.png";

const API_URL = import.meta.env.VITE_API_URL;

type ProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  sex: "MALE" | "FEMALE" | null;
  profilePicture: string | null;
  hasPin: boolean;
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: "10px",
  border: "1px solid rgba(20,140,255,.55)",
  background: "#0a2947",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#cfe6ff",
  fontSize: "13px",
  fontWeight: 700,
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE" | "">("");
  const [newPin, setNewPin] = useState("");
  const [repeatPin, setRepeatPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("viarank_auth_token");

      if (!token) {
        window.location.href = "/";
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudo cargar el perfil"
          );
        }

        setProfile(data);
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setSex(data.sex || "");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el perfil"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  async function saveProfile() {
    setMessage("");

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setMessage("Completá nombre, apellido y email.");
      return;
    }

    if (!sex) {
      setMessage("Seleccioná sexo.");
      return;
    }

    if (newPin || repeatPin) {
      if (!/^\d{4}$/.test(newPin)) {
        setMessage("El nuevo PIN debe tener exactamente 4 números.");
        return;
      }

      if (newPin !== repeatPin) {
        setMessage("Los PIN no coinciden.");
        return;
      }
    }

    const token = localStorage.getItem("viarank_auth_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          sex,
          newPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron guardar los cambios"
        );
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              ...data.user,
              hasPin: data.user.hasPin,
            }
          : current
      );

      setNewPin("");
      setRepeatPin("");
      setMessage("Cambios guardados correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at top, #0b3559 0%, #061a30 36%, #041426 100%)",
          color: "#ffffff",
          fontWeight: 800,
        }}
      >
        Cargando perfil...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0b3559 0%, #061a30 36%, #041426 100%)",
        color: "#f8fafc",
        padding: "12px 12px 50px",
        boxSizing: "border-box",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "620px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            height: "54px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <button
            onClick={() => navigate("/", { state: { internalReturn: true, user: location.state?.user } })}
            style={{
              justifySelf: "start",
              border: 0,
              background: "transparent",
              color: "#e7f2ff",
              padding: 0,
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ‹ Atrás
          </button>

          <img
            src={viarankHeaderLogo}
            alt="ViaRank"
            style={{
              width: "120px",
              height: "38px",
              objectFit: "contain",
              display: "block",
            }}
          />

          <div
            style={{
              justifySelf: "end",
              position: "relative",
              width: "43px",
              height: "43px",
            }}
          >
            <div
              style={{
                width: "43px",
                height: "43px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #1594ff",
                background: "#153d60",
                boxSizing: "border-box",
              }}
            >
              {profile?.profilePicture && (
                <img
                  src={profile.profilePicture}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>

            <span
              style={{
                position: "absolute",
                right: "-1px",
                bottom: "1px",
                width: "11px",
                height: "11px",
                borderRadius: "50%",
                background: "#19df66",
                border: "2px solid #061a30",
              }}
            />
          </div>
        </header>

        <section
          style={{
            border: "1px solid rgba(20,140,255,.55)",
            borderRadius: "18px",
            background: "rgba(5,25,47,.88)",
            padding: "20px 16px",
            boxShadow: "0 15px 35px rgba(0,0,0,.25)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 900,
            }}
          >
            Mi perfil
          </h1>

          <p
            style={{
              margin: "6px 0 20px",
              color: "#bcd3e9",
              fontSize: "14px",
            }}
          >
            Gestioná tu información personal y tu PIN de acceso.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "116px",
                height: "116px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid #1594ff",
                background: "#153d60",
                display: "grid",
                placeItems: "center",
                fontSize: "42px",
                fontWeight: 900,
              }}
            >
              {profile?.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt="Foto de perfil"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                firstName.slice(0, 1).toUpperCase()
              )}
            </div>

            <button
              type="button"
              disabled
              style={{
                marginTop: "10px",
                padding: "9px 20px",
                borderRadius: "999px",
                border: "1px solid #148cff",
                background: "transparent",
                color: "#8fcaff",
                fontWeight: 800,
                opacity: 0.65,
              }}
            >
              Cambiar foto
            </button>

            <span
              style={{
                marginTop: "5px",
                color: "#7896b4",
                fontSize: "11px",
              }}
            >
              Próximamente
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "14px",
            }}
          >
            <label>
              <span style={labelStyle}>Nombre</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={fieldStyle}
              />
            </label>

            <label>
              <span style={labelStyle}>Apellido</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={fieldStyle}
              />
            </label>
          </div>

          <label style={{ display: "block", marginTop: "14px" }}>
            <span style={labelStyle}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label style={{ display: "block", marginTop: "14px" }}>
            <span style={labelStyle}>Sexo</span>
            <select
              value={sex}
              onChange={(e) =>
                setSex(e.target.value as "MALE" | "FEMALE")
              }
              style={fieldStyle}
            >
              <option value="">Seleccionar</option>
              <option value="FEMALE">Femenino</option>
              <option value="MALE">Masculino</option>
            </select>
          </label>

          <div
            style={{
              height: "1px",
              background: "rgba(20,140,255,.3)",
              margin: "22px 0",
            }}
          />

          <h2
            style={{
              margin: "0 0 5px",
              fontSize: "19px",
            }}
          >
            Cambiar PIN
          </h2>

          <p
            style={{
              margin: "0 0 14px",
              color: "#9fb9d3",
              fontSize: "13px",
            }}
          >
            {profile?.hasPin
              ? "Ingresá un nuevo PIN solo si querés cambiar el actual."
              : "Creá tu PIN personal de 4 dígitos."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <label>
              <span style={labelStyle}>Nuevo PIN</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, ""))
                }
                style={fieldStyle}
                placeholder="4 dígitos"
              />
            </label>

            <label>
              <span style={labelStyle}>Repetir PIN</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={repeatPin}
                onChange={(e) =>
                  setRepeatPin(e.target.value.replace(/\D/g, ""))
                }
                style={fieldStyle}
                placeholder="4 dígitos"
              />
            </label>
          </div>

          {message && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 12px",
                borderRadius: "9px",
                background: "rgba(20,140,255,.12)",
                color: "#cfe8ff",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "13px",
              border: 0,
              borderRadius: "11px",
              background:
                "linear-gradient(90deg, #087dff, #148cff)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </section>
      </main>
    </div>
  );
}
