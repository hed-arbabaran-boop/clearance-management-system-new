import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import UserLogin from "./pages/userlogin.jsx";
import Register from "./pages/register.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<UserLogin />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
