import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import EventDetail from "./pages/EventDetail";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import NewEvent from "./pages/NewEvent";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { API_BASE } from "./config";
import { getAuthHeaders, hasStoredUserSession } from "./utils/auth";

const formatEventTime = (value) => {
  if (!value) {
    return "To be announced";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

function EventList({ events, onRefresh, onEdit, onDelete }) {
  return (
    <section className="mt-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Events</h2>
          <p className="mt-1 text-sm text-slate-500">
            {events.length} {events.length === 1 ? "event" : "events"} scheduled
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="group relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {events.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-blue-50/50"></div>
          <div className="relative">
            <svg
              className="mx-auto h-16 w-16 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No events yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Get started by creating your first event from the New Event page
            </p>
          </div>
        </div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((eventItem) => (
          <li
            key={eventItem.id || eventItem._id}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>

            <div className="absolute right-5 top-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <svg
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                {eventItem.rsvps?.length || 0}
              </span>
            </div>

            <h3 className="pr-16 text-xl font-bold leading-tight text-slate-900">
              {eventItem.title}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              {eventItem.description}
            </p>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Time
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {formatEventTime(eventItem.time)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg
                    className="h-4 w-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {eventItem.location || "To be announced"}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="relative z-10 mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(eventItem)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(eventItem)}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-blue-500/0 transition-opacity group-hover:from-emerald-500/5 group-hover:to-blue-500/5"></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RequireAuth({ children }) {
  if (!hasStoredUserSession()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const editEvent = (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId) {
      return;
    }
    navigate(`/events/${eventId}`);
  };

  const deleteEvent = async (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId) {
      return;
    }

    const confirmed = window.confirm(`Delete event "${eventItem.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/events/${eventId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      await fetchEvents();
    } catch (error) {
      alert(error.message || "Delete failed");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 animate-spin text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="mt-4 text-sm text-slate-600">Loading events...</p>
            </div>
          </div>
        ) : (
          <EventList
            events={events}
            onRefresh={fetchEvents}
            onEdit={editEvent}
            onDelete={deleteEvent}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
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
