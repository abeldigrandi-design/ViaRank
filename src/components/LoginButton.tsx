import { loginWithStrava } from "../services/strava";
import stravaConnectButton from "../assets/strava-connect-orange.png";

function LoginButton() {
  return (
    <button
      onClick={loginWithStrava}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Connect with Strava"
    >
      <img
        src={stravaConnectButton}
        alt="Connect with Strava"
        style={{
          display: "block",
          height: "48px",
          width: "auto",
        }}
      />
    </button>
  );
}

export default LoginButton;
