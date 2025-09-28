import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Central from "./pages/Central";
import Agendamentos from "./pages/Agendamentos";

function App() {
  return (
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to={'/login'}/>}/>
            <Route path='/login' element={<Login />} />
            <Route path="/central" element={<Central />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
          </Routes>
        </Router>
  )
}

export default App