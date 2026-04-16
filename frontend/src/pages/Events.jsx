import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EventFiltersBar from "../components/EventFiltersBar";
import EventListPanel from "../components/EventListPanel";
import { API_BASE } from "../config";
import { getAuthHeaders } from "../utils/auth";
import {
  filterEventsByCriteria,
  hasActiveEventFilters,
  sortEventsByTimeline,
} from "../utils/events";

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchEvents = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/events?scope=all`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await res.json();
      setEvents(sortEventsByTimeline(Array.isArray(data) ? data : []));
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

  const filteredEvents = filterEventsByCriteria(events, {
    searchTerm,
    startDate,
    endDate,
  });
  const hasActiveFilters = hasActiveEventFilters({
    searchTerm,
    startDate,
    endDate,
  });
  const summary = hasActiveFilters
    ? `${filteredEvents.length} ${
        filteredEvents.length === 1 ? "event matches" : "events match"
      } your filters`
    : `${filteredEvents.length} ${
        filteredEvents.length === 1 ? "event" : "events"
      } across the workspace`;
  const emptyMessage = hasActiveFilters
    ? "No events match your current search or date range."
    : "No events have been created yet.";

  return (
    <div className="mint-page">
      <div className="mint-content max-w-7xl">
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
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                Loading events...
              </p>
            </div>
          </div>
        ) : (
          <EventListPanel
            events={filteredEvents}
            heading="All Events"
            summary={summary}
            emptyMessage={emptyMessage}
            filters={
              <EventFiltersBar
                searchTerm={searchTerm}
                startDate={startDate}
                endDate={endDate}
                onSearchTermChange={setSearchTerm}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onReset={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                }}
              />
            }
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={fetchEvents}
                  className="mint-pill-btn mint-btn-primary group relative inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm sm:flex-none"
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

                <Link
                  to="/new-event"
                  aria-label="Create new event"
                  className="mint-pill-btn mint-btn-primary inline-flex h-11 w-11 shrink-0 items-center justify-center p-0 text-2xl font-semibold leading-none"
                >
                  +
                </Link>
              </div>
            }
            onOpen={openEvent}
            onDelete={deleteEvent}
            showManageActions
          />
        )}
      </div>
    </div>
  );
}
