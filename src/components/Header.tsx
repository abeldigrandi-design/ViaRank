export default function Header() {
  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

        {/* LOGO VIARANK */}
        <div className="flex items-center">
          <img
            src="/viarank-logo.png"
            alt="ViaRank"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* PARTE DERECHA */}
        <div className="flex items-center gap-6">

          <button className="rounded-full bg-slate-700 p-3 text-xl transition hover:scale-110 hover:bg-slate-600">
            🔔
          </button>

          <button className="rounded-full bg-slate-700 p-3 text-xl transition hover:scale-110 hover:bg-slate-600">
            ⚙️
          </button>

          <div className="flex items-center gap-3 rounded-full bg-slate-700 px-4 py-2">

            <img
              src="https://i.pravatar.cc/80?img=15"
              alt="avatar"
              className="h-12 w-12 rounded-full border-2 border-lime-400"
            />

            <div>
              <p className="font-bold text-white">
                Abel Digrandi
              </p>

              <p className="text-xs text-slate-300">
                Nivel PRO
              </p>
            </div>

          </div>

        </div>

      </div>
    </header>
  );
}