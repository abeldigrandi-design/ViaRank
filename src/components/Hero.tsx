import Navbar from "./Navbar";
import LoginButton from "./LoginButton";

function Hero() {
  return (
    <>
      <Navbar />

      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-28 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-14 px-6 lg:flex-row">
          {/* Texto */}
          <div className="max-w-xl">
            <h1 className="mb-6 text-6xl font-extrabold leading-tight text-red-500">
  PROBANDO CAMBIOS
  
              <br />
              merece un ranking.
            </h1>

            <p className="mb-10 text-xl text-gray-300">
              Conectá tu cuenta de Strava y descubrí cómo te comparás con atletas
              de tu ciudad, provincia, país y del mundo.
            </p>

            <LoginButton />
          </div>

          {/* Imagen temporal */}
          <div className="flex h-96 w-full max-w-lg items-center justify-center rounded-3xl bg-slate-700 shadow-2xl">
            <span className="text-center text-2xl text-gray-300">
              🚴
              <br />
              Próximamente
              <br />
              Imagen deportiva
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

export default Hero;
