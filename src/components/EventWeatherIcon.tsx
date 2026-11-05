type Props = {
  weatherCode: number;
  size?: number;
};

export default function EventWeatherIcon({
  weatherCode,
  size = 90,
}: Props) {
  const rain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode);
  const snow = [71, 73, 75, 77, 85, 86].includes(weatherCode);
  const storm = [95, 96, 99].includes(weatherCode);
  const fog = [45, 48].includes(weatherCode);
  const cloudy = weatherCode === 3;
  const partly = weatherCode === 1 || weatherCode === 2;
  const sunny = weatherCode === 0 || (!rain && !snow && !storm && !fog && !cloudy && !partly);

  const description = storm
    ? "Tormenta"
    : snow
    ? "Nieve"
    : rain
    ? "Lluvia"
    : fog
    ? "Niebla"
    : cloudy
    ? "Nublado"
    : partly
    ? "Parcialmente nublado"
    : "Despejado";

  const showSun = sunny || partly;
  const showCloud = !sunny;
  const uid = `weather-${weatherCode}`;

  return (
    <div
      role="img"
      aria-label={description}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        aria-hidden="true"
        style={{ overflow: "visible", filter: "drop-shadow(0 7px 8px rgba(0,0,0,.25))" }}
      >
        <defs>
          <radialGradient id={`${uid}-sun`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff8b0" />
            <stop offset="45%" stopColor="#ffd849" />
            <stop offset="100%" stopColor="#ff9200" />
          </radialGradient>
          <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#d9efff" />
            <stop offset="100%" stopColor="#78a6d0" />
          </linearGradient>
          <linearGradient id={`${uid}-rain`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#92efff" />
            <stop offset="100%" stopColor="#0879e9" />
          </linearGradient>
          <linearGradient id={`${uid}-bolt`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff8a0" />
            <stop offset="100%" stopColor="#ffad00" />
          </linearGradient>
        </defs>

        {showSun && (
          <g>
            {Array.from({ length: 8 }, (_, i) => (
              <line
                key={i}
                x1="60"
                y1="10"
                x2="60"
                y2="19"
                stroke="#ffd65b"
                strokeWidth="5"
                strokeLinecap="round"
                transform={`rotate(${i * 45} 60 60)`}
              />
            ))}
            <circle cx="60" cy="60" r="28" fill={`url(#${uid}-sun)`} />
            <circle cx="52" cy="50" r="12" fill="#fff9c8" opacity=".28" />
          </g>
        )}

        {showCloud && (
          <g transform={partly ? "translate(9 16) scale(.88)" : "translate(0 0)"}>
            <path
              d="M30 85 C15 85 11 73 16 63 C20 54 28 52 37 54 C41 37 55 29 69 34 C79 37 84 44 86 53 C100 52 109 62 108 73 C107 82 100 87 89 87 L31 87 Z"
              fill={`url(#${uid}-cloud)`}
              stroke="#c9eaff"
              strokeWidth="2"
            />
            <path
              d="M28 62 C37 57 43 60 47 51 C55 34 77 38 82 56"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              opacity=".55"
            />
          </g>
        )}

        {rain && (
          <g fill={`url(#${uid}-rain)`}>
            <path d="M36 91 C36 91 30 100 30 104 A6 6 0 0 0 42 104 C42 100 36 91 36 91Z" />
            <path d="M60 91 C60 91 54 100 54 104 A6 6 0 0 0 66 104 C66 100 60 91 60 91Z" />
            <path d="M84 91 C84 91 78 100 78 104 A6 6 0 0 0 90 104 C90 100 84 91 84 91Z" />
          </g>
        )}

        {storm && (
          <path
            d="M66 83 L47 106 L62 105 L55 119 L86 92 L70 94 L80 83Z"
            fill={`url(#${uid}-bolt)`}
            stroke="#ffe98b"
            strokeWidth="1.5"
          />
        )}

        {snow && (
          <g stroke="#b9f3ff" strokeWidth="3" strokeLinecap="round">
            {[36, 60, 84].map((x) => (
              <g key={x}>
                <line x1={x} y1="94" x2={x} y2="110" />
                <line x1={x - 7} y1="102" x2={x + 7} y2="102" />
                <line x1={x - 5} y1="97" x2={x + 5} y2="107" />
                <line x1={x + 5} y1="97" x2={x - 5} y2="107" />
              </g>
            ))}
          </g>
        )}

        {fog && (
          <g stroke="#c5e7f4" strokeWidth="5" strokeLinecap="round" opacity=".8">
            <line x1="19" y1="92" x2="101" y2="92" />
            <line x1="29" y1="103" x2="91" y2="103" />
            <line x1="39" y1="114" x2="81" y2="114" />
          </g>
        )}
      </svg>

      <span
        style={{
          fontSize: "11px",
          color: "#b8dfff",
          fontWeight: 700,
        }}
      >
        {description}
      </span>
    </div>
  );
}