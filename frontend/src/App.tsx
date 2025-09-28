import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Central from "./pages/Central";
import Agendamentos from "./pages/Agendamentos";
import Perfil from "./pages/Perfil";
import Ajuda from "./pages/Ajuda";
import NotFound from "./pages/NotFound";
import { AccessibilityProvider } from "./components/AccessibilityContext";

// ⬇️ importa o Provider

function App() {
  return (
    // ⬇️ agora toda a aplicação está dentro do Provider
    <AccessibilityProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to={"/central"} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/central" element={<Central />} />
          <Route path="/beneficiario" element={<Paciente />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/ajuda" element={<Ajuda />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AccessibilityProvider>
  );
}

export default App;
