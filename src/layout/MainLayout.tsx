import type { ReactNode } from "react";
import Header from "../components/Header";

type Props = {
  children: ReactNode;
};

const menu = [
  { icon: "🏠", text: "Dashboard" },
  { icon: "👤", text: "Mi Perfil" },
  { icon: "🥇", text: "Ranking" },
  { icon: "🚴", text: "Actividades" },
  { icon: "🏅", text: "Desafíos" },
  { icon: "⚙️", text: "Configuración" },
];

export default function MainLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <div className="mx-auto flex max-w-7xl gap-8 p-8">
        <aside className="w-72 rounded-3xl bg-slate-900 p-6 text-white shadow-2xl">
          <div className="mb-8 text-center">
            <img
              src="https://i.pravatar.cc/120?img=15"
              className="mx-auto mb-4 h-24 w-24 rounded-full border-4 border-orange-500"
            />

            <h2 className="text-xl font-bold">
              Abel Digrandi
            </h2>

            <p className="text-sm text-slate-400">
              Nivel Pro
            </p>
          </div>

          <nav className="space-y-2">
            {menu.map((item, index) => (
              <button
                key={index}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 transition ${
                  index === 0
                    ? "bg-orange-500"
                    : "hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">{item.icon}</span>

                <span>{item.text}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
