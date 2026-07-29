const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI;

export function loginWithStrava() {
  console.log("CLIENT_ID:", CLIENT_ID);
  console.log("REDIRECT_URI:", REDIRECT_URI);

  const url =
    `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&approval_prompt=force` +
    `&scope=read,activity:read_all`;

  console.log("URL:", url);

  window.location.href = url;
}
