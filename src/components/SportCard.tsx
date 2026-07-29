type SportCardProps = {
  emoji: string;
  name: string;
};

function SportCard({ emoji, name }: SportCardProps) {
  return (
    <div className="w-64 cursor-pointer rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <div className="mb-4 text-6xl">
        {emoji}
      </div>

      <h3 className="text-2xl font-bold text-slate-800">
        {name}
      </h3>

      <p className="mt-3 text-gray-500">
        Descubrí rankings, desafíos y estadísticas.
      </p>
    </div>
  );
}

export default SportCard;
