import { loginWithStrava } from "../services/strava";

function LoginButton() {
  return (
    <button
      onClick={loginWithStrava}
      className="rounded-xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-orange-600"
    >
      🚴 Conectar con Strava
    </button>
  );
}

export default LoginButton;
