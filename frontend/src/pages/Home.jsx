import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventListPanel from "../components/EventListPanel";
import { API_BASE } from "../config";
import { getAuthHeaders, getStoredUserRole } from "../utils/auth";
import { splitEventsByTimeline } from "../utils/events";

function AdminHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
      <div className="mx-auto flex w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.24),_transparent_45%)]"></div>
            <div className="relative max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                FlashGather Admin
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight">
                Welcome to Admin Panel
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Manage your event operations from one place. Use the Events page
                in the sidebar to review, edit, and create gatherings for your
                team.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MemberHomePage() {
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
      const { upcomingEvents } = splitEventsByTimeline(
        Array.isArray(data) ? data : [],
      );
      setEvents(upcomingEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEvent = (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId) {
      return;
    }
    navigate(`/events/${eventId}`);
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
          <EventListPanel
            events={events}
            heading="Events You're In"
            summary={`${events.length} ${
              events.length === 1 ? "event" : "events"
            } coming up`}
            emptyMessage="No upcoming events right now. Check History for earlier events you've joined."
            toolbar={
              <button
                onClick={fetchEvents}
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
            }
            onOpen={openEvent}
            isAdmin={false}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return getStoredUserRole() === "admin" ? (
    <AdminHomePage />
  ) : (
    <MemberHomePage />
  );
}
