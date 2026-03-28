import { Navigate, Route, Routes } from "react-router-dom";
import EventDetail from "./pages/EventDetail";
import Events from "./pages/Events";
import History from "./pages/History";
import Home from "./pages/Home";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import MyEvents from "./pages/MyEvents";
import NewEvent from "./pages/NewEvent";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import UserManagement from "./pages/UserManagement";
import { getStoredUserRole, hasStoredUserSession } from "./utils/auth";

function RequireAuth({ children }) {
  if (!hasStoredUserSession()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  if (!hasStoredUserSession()) {
    return <Navigate to="/login" replace />;
  }

  if (getStoredUserRole() !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireMember({ children }) {
  if (!hasStoredUserSession()) {
    return <Navigate to="/login" replace />;
  }

  if (getStoredUserRole() === "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/events"
          element={
            <RequireAdmin>
              <Events />
            </RequireAdmin>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAdmin>
              <UserManagement />
            </RequireAdmin>
          }
        />
        <Route
          path="/history"
          element={
            <RequireMember>
              <History />
            </RequireMember>
          }
        />
        <Route
          path="/my-events"
          element={
            <RequireMember>
              <MyEvents />
            </RequireMember>
          }
        />
        <Route
          path="/new-event"
          element={
            <RequireAuth>
              <NewEvent />
            </RequireAuth>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <RequireAuth>
              <EventDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}
