import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Central from "./pages/Central";
import Paciente from "./pages/Paciente";
import Agendamentos from "./pages/Agendamentos";
import Perfil from "./pages/Perfil";
import Ajuda from "./pages/Ajuda";
import NotFound from "./pages/NotFound";

function App() {

  return (
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to={'/login'}/>}/>
            <Route path='/login' element={<Login />} />
            <Route path='/login' element={<Login />} />
            <Route path="/central" element={<Central />} />
            <Route path="/beneficiario" element={<Paciente />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/ajuda" element={<Ajuda />} />
            <Route path='*' element={<NotFound />} />
          </Routes>
        </Router>
  )
}

export default App