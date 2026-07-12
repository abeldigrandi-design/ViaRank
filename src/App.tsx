import Header from "./components/Header";

function App() {
  return (
    <div>
      <Header />

      <main
        style={{
          padding: "40px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>Bienvenido a ViaRank</h2>

        <p>La plataforma de rankings deportivos conectada con Strava.</p>

        <button
          style={{
            marginTop: "30px",
            padding: "15px 30px",
            fontSize: "18px",
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Conectar con Strava
        </button>
      </main>
    </div>
  );
}

export default App;
