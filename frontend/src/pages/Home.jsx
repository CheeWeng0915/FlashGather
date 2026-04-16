import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventFiltersBar from "../components/EventFiltersBar";
import EventListPanel from "../components/EventListPanel";
import { useToast } from "../components/toastContext";
import { API_BASE } from "../config";
import { getAuthHeaders, getStoredUserRole } from "../utils/auth";
import { formatDisplayDateRange } from "../utils/dateDisplay";
import {
  filterEventsByCriteria,
  getEventDateRange,
  hasActiveEventFilters,
  splitEventsByTimeline,
} from "../utils/events";

function AdminHomePage() {
  return (
    <div className="mint-page">
      <div className="mint-content flex w-full max-w-5xl">
        <section className="mint-hero w-full">
          <div className="max-w-2xl">
            <p className="mint-label">FlashGather Admin</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.8px]">
              Welcome to Admin Panel
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
              Manage your event operations from one place. Use the Events page
              in the sidebar to review, edit, and create gatherings for your
              team.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function MemberHomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningEventId, setJoiningEventId] = useState("");
  const [leavingEventId, setLeavingEventId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const readApiError = async (response, fallbackMessage) => {
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      // no-op
    }

    return fallbackMessage;
  };

  const formatEventDates = (eventItem) => {
    const { startDate: eventStartDate, endDate: eventEndDate } =
      getEventDateRange(eventItem);
    return formatDisplayDateRange(
      eventStartDate,
      eventEndDate,
      "To be announced",
    );
  };

  const fetchEvents = async () => {
    setIsLoading(true);

    try {
      const [joinedResponse, recommendedResponse] = await Promise.all([
        fetch(`${API_BASE}/events?scope=joined`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/events/recommended`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!joinedResponse.ok) {
        throw new Error(
          await readApiError(joinedResponse, "Failed to fetch joined events."),
        );
      }

      if (!recommendedResponse.ok) {
        throw new Error(
          await readApiError(
            recommendedResponse,
            "Failed to fetch recommended events.",
          ),
        );
      }

      const [joinedData, recommendedData] = await Promise.all([
        joinedResponse.json(),
        recommendedResponse.json(),
      ]);

      const { upcomingEvents } = splitEventsByTimeline(
        Array.isArray(joinedData) ? joinedData : [],
      );
      setEvents(upcomingEvents);
      setRecommendedEvents(Array.isArray(recommendedData) ? recommendedData : []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      showToast({
        type: "error",
        title: "Unable to load home",
        message: error.message || "Unable to load events right now.",
      });
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

  const joinEvent = async (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId || joiningEventId) {
      return;
    }

    setJoiningEventId(eventId);

    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/join`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to join event."));
      }

      showToast({
        type: "success",
        title: "Joined event",
        message: `You joined "${eventItem.title}".`,
      });
      await fetchEvents();
    } catch (error) {
      showToast({
        type: "error",
        title: "Join failed",
        message: error.message || "Unable to join event.",
      });
    } finally {
      setJoiningEventId("");
    }
  };

  const leaveEvent = async (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId || leavingEventId) {
      return;
    }

    const confirmed = window.confirm(`Leave event "${eventItem.title}"?`);
    if (!confirmed) {
      return;
    }

    setLeavingEventId(eventId);

    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/join`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to leave event."));
      }

      showToast({
        type: "success",
        title: "Left event",
        message: `You left "${eventItem.title}".`,
      });
      await fetchEvents();
    } catch (error) {
      showToast({
        type: "error",
        title: "Leave failed",
        message: error.message || "Unable to leave event.",
      });
    } finally {
      setLeavingEventId("");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      } coming up`;
  const emptyMessage = hasActiveFilters
    ? "No upcoming events match your current search or date range."
    : "No upcoming events right now. Check History for earlier events you've joined.";

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
          <>
            <EventListPanel
              events={filteredEvents}
              heading="Events You're In"
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
                <button
                  onClick={fetchEvents}
                  className="mint-pill-btn mint-btn-primary group relative inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm sm:w-auto"
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
              onLeave={leaveEvent}
              leavingEventId={leavingEventId}
              showManageActions={false}
            />

            <section className="mt-10">
              <div className="mb-6">
                <p className="mint-label">Recommendations</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.24px] text-[var(--color-text)]">
                  Recommended Events
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Join upcoming events you are not part of yet.
                </p>
              </div>

              {recommendedEvents.length === 0 ? (
                <div className="mint-card p-8 text-center text-sm text-[var(--color-text-muted)]">
                  No recommended events right now.
                </div>
              ) : (
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendedEvents.map((eventItem) => {
                    const eventId = eventItem.id || eventItem._id;

                    return (
                      <li
                        key={eventId}
                        className="mint-card p-6"
                      >
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">
                          {eventItem.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                          {eventItem.description || "No description provided."}
                        </p>

                        <dl className="mt-4 space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-[var(--color-text-muted)]">Dates</dt>
                            <dd className="font-medium text-[var(--color-text)]">
                              {formatEventDates(eventItem)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-[var(--color-text-muted)]">Location</dt>
                            <dd className="font-medium text-[var(--color-text)]">
                              {eventItem.location || "To be announced"}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-[var(--color-text-muted)]">Participants</dt>
                            <dd className="font-medium text-[var(--color-text)]">
                              {eventItem.participantCount || 0}
                            </dd>
                          </div>
                        </dl>

                        <button
                          type="button"
                          onClick={() => joinEvent(eventItem)}
                          disabled={joiningEventId === eventId}
                          className="mint-pill-btn mint-btn-primary mt-5 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {joiningEventId === eventId ? "Joining..." : "Join Event"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
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
