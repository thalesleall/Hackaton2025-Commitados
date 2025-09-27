import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom"

// pages
import Login from "./pages/Login"
import Central from "./pages/Central"
import Paciente from "./pages/Paciente"
import Agendamentos from "./pages/Agendamentos"
import Perfil from "./pages/Perfil"
import Ajuda from "./pages/Ajuda"

function App() {
  return (
    <Router>
      <Routes>
        {/* redireciona / para /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* rotas principais */}
        <Route path="/login" element={<Login />} />
        <Route path="/central" element={<Central />} />
        <Route path="/beneficiario" element={<Paciente />} />
        <Route path="/agendamentos" element={<Agendamentos />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/ajuda" element={<Ajuda />} />

        {/* rota coringa (404) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
