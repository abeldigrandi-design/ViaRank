import { loginWithStrava } from "../services/strava";

function LoginButton() {
  return (
    <button
      onClick={loginWithStrava}
      style={{
        background: "red",
        color: "white",
        fontSize: "24px",
        padding: "20px",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
      }}
    >
      🚴 CONECTAR CON STRAVA
    </button>
  );
}

export default LoginButton;
