function Stats() {
  const stats = [
    { number: "+25.000", label: "Atletas" },
    { number: "+3 M", label: "Actividades" },
    { number: "120+", label: "Países" },
  ];

  return (
    <section className="bg-slate-900 py-16 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-20">
        {stats.map((item) => (
          <div key={item.label} className="text-center">
            <h2 className="text-5xl font-bold text-orange-500">
              {item.number}
            </h2>

            <p className="mt-3 text-lg text-gray-300">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Stats;
