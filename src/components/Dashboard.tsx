export default function Dashboard() {
  const top3 = [
    {
      puesto: "🥇",
      nombre: "Abel Digrandi",
      km: 1254,
      color: "bg-yellow-100 border-yellow-400",
    },
    {
      puesto: "🥈",
      nombre: "Martín López",
      km: 1180,
      color: "bg-slate-100 border-slate-400",
    },
    {
      puesto: "🥉",
      nombre: "Laura Pérez",
      km: 1098,
      color: "bg-orange-100 border-orange-400",
    },
  ];

  const deportes = [
    {
      icono: "🚴",
      nombre: "Ciclismo",
      actividades: 42,
    },
    {
      icono: "🏃",
      nombre: "Running",
      actividades: 18,
    },
    {
      icono: "🏊",
      nombre: "Natación",
      actividades: 9,
    },
    {
      icono: "🥾",
      nombre: "Senderismo",
      actividades: 14,
    },
  ];

  return (
    <>
      <h1 className="mb-8 text-4xl font-bold">
        Dashboard
      </h1>

      <div className="mb-10 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-gray-500">Usuarios</p>
          <h2 className="mt-2 text-4xl font-bold">124</h2>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-gray-500">Actividades</p>
          <h2 className="mt-2 text-4xl font-bold">3580</h2>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-gray-500">Kilómetros</p>
          <h2 className="mt-2 text-4xl font-bold">42.830</h2>
        </div>

        <div className="rounded-2xl bg-orange-500 p-6 text-white shadow-lg">
          <p>Tu posición</p>
          <h2 className="mt-2 text-5xl font-bold">#1</h2>
        </div>
      </div>

      <h2 className="mb-5 text-3xl font-bold">
        🏆 Top 3
      </h2>

      <div className="mb-12 grid gap-6 md:grid-cols-3">
        {top3.map((u) => (
          <div
            key={u.nombre}
            className={`rounded-3xl border-2 p-6 shadow-lg ${u.color}`}
          >
            <div className="text-center">
              <div className="mb-3 text-6xl">
                {u.puesto}
              </div>

              <img
                src="https://i.pravatar.cc/120"
                className="mx-auto mb-4 h-24 w-24 rounded-full"
              />

              <h3 className="text-2xl font-bold">
                {u.nombre}
              </h3>

              <p className="mt-2 text-lg">
                {u.km} km
              </p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-5 text-3xl font-bold">
        🚴 Deportes
      </h2>

      <div className="grid gap-6 md:grid-cols-4">
        {deportes.map((d) => (
          <div
            key={d.nombre}
            className="rounded-2xl bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="text-5xl">
              {d.icono}
            </div>

            <h3 className="mt-4 text-2xl font-bold">
              {d.nombre}
            </h3>

            <p className="mt-2 text-gray-500">
              {d.actividades} actividades
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
