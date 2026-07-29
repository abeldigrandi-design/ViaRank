function Navbar() {
  return (
    <nav className="bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-orange-500">
          🏆 ViaRank
        </h1>

        <div className="flex gap-8 text-sm font-medium">
          <a href="#" className="hover:text-orange-400">
            Inicio
          </a>

          <a href="#" className="hover:text-orange-400">
            Rankings
          </a>

          <a href="#" className="hover:text-orange-400">
            Desafíos
          </a>

          <a href="#" className="hover:text-orange-400">
            Perfil
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
