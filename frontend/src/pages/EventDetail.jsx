import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EventForm from "../components/EventForm";
import ItineraryItemForm from "../components/ItineraryItemForm";
import { API_BASE } from "../config";
import { getAuthHeaders, getStoredUser, getStoredUserRole } from "../utils/auth";
import {
  formatDisplayDate,
  formatDisplayDateRange,
  formatDisplayTime,
} from "../utils/dateDisplay";
import { useToast } from "../components/toastContext";
import { isPastEvent } from "../utils/events";

const readApiError = async (response, fallbackMessage) => {
  let errorMessage = fallbackMessage;

  try {
    const errorData = await response.json();
    const validationError =
      Array.isArray(errorData.errors) && errorData.errors.length > 0
        ? errorData.errors[0].msg
        : null;

    errorMessage = validationError || errorData.error || fallbackMessage;
  } catch {
    errorMessage = fallbackMessage;
  }

  throw new Error(errorMessage);
};

const groupItineraryByDate = (items) => {
  const groups = [];
  const map = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const dateKey = item.date || "No Date";
    if (!map.has(dateKey)) {
      const nextGroup = {
        date: dateKey,
        items: [],
      };
      map.set(dateKey, nextGroup);
      groups.push(nextGroup);
    }

    map.get(dateKey).items.push(item);
  }

  return groups;
};

function SummaryCard({ eventItem, notice = "" }) {
  return (
    <article className="mint-panel overflow-hidden">
      <div className="mint-hero rounded-none border-0 shadow-none">
        <p className="mint-label">
          Event Overview
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.6px] text-[var(--color-text)]">
          {eventItem.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          {eventItem.description || "No description provided for this event."}
        </p>
        {notice ? (
          <div className="mt-4 inline-flex rounded-full border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-4 py-2 text-xs font-medium text-[var(--color-accent)]">
            {notice}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="mint-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Event Dates
          </p>
          <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
            {formatDisplayDateRange(eventItem.startDate, eventItem.endDate)}
          </p>
        </div>

        <div className="mint-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Owner
          </p>
          <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
            {eventItem.owner?.username || "Unknown owner"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {eventItem.owner?.email || "No email available"}
          </p>
        </div>

        <div className="mint-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Participants
          </p>
          <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
            {eventItem.participantCount || 0} joined
          </p>
        </div>
      </div>

      {Array.isArray(eventItem.participants) && eventItem.participants.length > 0 ? (
        <div className="border-t border-[var(--color-border)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Participant List
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {eventItem.participants.map((participant) => (
              <span
                key={participant.id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]"
              >
                {participant.username}
                <span className="text-[var(--color-text-muted)]">|</span>
                {participant.email}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ItinerarySection({
  eventItem,
  currentUserId,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const groupedItems = groupItineraryByDate(eventItem.itineraryItems);
  const canCreateItinerary =
    Boolean(eventItem.permissions?.canCreateItinerary) && !eventItem.isLocked;
  const canManageAllItinerary = Boolean(
    eventItem.permissions?.canManageAllItinerary,
  );

  const dateBounds = {
    startDate: eventItem.startDate,
    endDate: eventItem.endDate,
  };

  const resetComposer = () => {
    setIsAddingItem(false);
    setEditingItemId(null);
  };

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mint-label">
            Itinerary
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
            Travel Timeline
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {eventItem.isLocked
              ? "This event has ended, so the itinerary is now read-only."
              : "Add time-based stops for each day in this event."}
          </p>
        </div>

        {canCreateItinerary && !isAddingItem ? (
          <button
            type="button"
            onClick={() => {
              setEditingItemId(null);
              setIsAddingItem(true);
            }}
            className="mint-pill-btn mint-btn-primary inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
          >
            Add Itinerary Item
          </button>
        ) : null}
      </div>

      {isAddingItem ? (
        <ItineraryItemForm
          title="Add Itinerary Item"
          description="Choose the day, time, location, and optional notes for this stop."
          dateBounds={dateBounds}
          submitLabel="Save Itinerary Item"
          submittingLabel="Saving..."
          onSubmit={onCreateItem}
          onSuccess={() => {
            setIsAddingItem(false);
          }}
          onCancel={() => setIsAddingItem(false)}
        />
      ) : null}

      {groupedItems.length === 0 ? (
        <div className="mint-card border-dashed p-10 text-center">
          <svg
            className="mx-auto h-14 w-14 text-[var(--color-text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm7-7h.01"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
            No itinerary items yet
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {canCreateItinerary
              ? "Start by adding the first stop for this event."
              : "No stops have been added to this event yet."}
          </p>
        </div>
      ) : null}

      {groupedItems.map((group) => (
        <article
          key={group.date}
          className="mint-card overflow-hidden"
        >
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              {formatDisplayDate(group.date)}
            </p>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {group.items.map((item) => {
              const canManageItem =
                !eventItem.isLocked &&
                (canManageAllItinerary || item.createdBy === currentUserId);

              if (editingItemId === item.id) {
                return (
                  <div key={item.id} className="p-5">
                    <ItineraryItemForm
                      title="Edit Itinerary Item"
                      description="Update this stop and save the changes."
                      initialValues={item}
                      dateBounds={dateBounds}
                      submitLabel="Save Changes"
                      submittingLabel="Saving..."
                      onSubmit={(payload) => onUpdateItem(item.id, payload)}
                      onSuccess={resetComposer}
                      onCancel={resetComposer}
                    />
                  </div>
                );
              }

              return (
                <div key={item.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-full border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                          {formatDisplayTime(item.time)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                          Added by {item.author?.username || "Unknown user"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-text)]">
                          {item.location}
                        </h3>
                        {item.lat !== null && item.lng !== null ? (
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Coordinates: {Number(item.lat).toFixed(6)},{" "}
                            {Number(item.lng).toFixed(6)}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                        {item.notes || "No extra notes for this stop."}
                      </p>
                    </div>

                    {canManageItem ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingItem(false);
                            setEditingItemId(item.id);
                          }}
                           className="mint-pill-btn mint-btn-secondary px-4 py-2 text-sm font-semibold"
                         >
                           Edit
                         </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = getStoredUser();
  const [eventItem, setEventItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [isLeavingEvent, setIsLeavingEvent] = useState(false);
  const userRole = getStoredUserRole();
  const isAdmin = userRole === "admin";

  useEffect(() => {
    const controller = new AbortController();

    const fetchEvent = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        if (!response.ok) {
          await readApiError(response, "Unable to load event.");
        }

        const data = await response.json();
        setEventItem(data);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        setLoadError(error.message || "Unable to load event.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();

    return () => controller.abort();
  }, [eventId, reloadToken]);

  const reloadEvent = () => setReloadToken((value) => value + 1);

  const updateEvent = async (payload) => {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await readApiError(response, "Unable to update event.");
    }

    return response.json();
  };

  const createItineraryItem = async (payload) => {
    const response = await fetch(`${API_BASE}/events/${eventId}/itinerary-items`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await readApiError(response, "Unable to create itinerary item.");
    }

    const data = await response.json();
    reloadEvent();
    return data;
  };

  const updateItineraryItem = async (itemId, payload) => {
    const response = await fetch(
      `${API_BASE}/events/${eventId}/itinerary-items/${itemId}`,
      {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      await readApiError(response, "Unable to update itinerary item.");
    }

    const data = await response.json();
    reloadEvent();
    return data;
  };

  const deleteItineraryItem = async (item) => {
    const confirmed = window.confirm(
      `Delete itinerary item at ${item.location} on ${formatDisplayDate(item.date)} ${formatDisplayTime(item.time)}?`,
    );
    if (!confirmed) {
      return;
    }

    const response = await fetch(
      `${API_BASE}/events/${eventId}/itinerary-items/${item.id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      await readApiError(response, "Unable to delete itinerary item.");
    }

    reloadEvent();
  };

  const isLocked = eventItem
    ? Boolean(eventItem.isLocked || isPastEvent(eventItem))
    : false;
  const canEditEvent = Boolean(eventItem?.permissions?.canEditEvent) && !isLocked;
  const canLeaveEvent =
    !isLocked && !canEditEvent && !isAdmin && !isLoading && !loadError && Boolean(eventItem);
  const backPath = isAdmin
    ? "/events"
    : eventItem?.permissions?.canEditEvent
      ? "/my-events"
      : isLocked
        ? "/history"
        : "/";
  const backLabel = isAdmin
    ? "Back to Events"
    : eventItem?.permissions?.canEditEvent
      ? "Back to My Events"
      : `Back to ${isLocked ? "History" : "Home"}`;
  const notice = isLocked
    ? "Past events are locked and can no longer be edited."
    : "";

  const leaveEvent = async () => {
    if (!eventItem || isLeavingEvent) {
      return;
    }

    const confirmed = window.confirm(`Leave event "${eventItem.title}"?`);
    if (!confirmed) {
      return;
    }

    setIsLeavingEvent(true);

    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/join`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        await readApiError(response, "Unable to leave this event.");
      }

      showToast({
        type: "success",
        title: "Left event",
        message: `You left "${eventItem.title}".`,
      });
      navigate("/", { replace: true });
    } catch (error) {
      showToast({
        type: "error",
        title: "Leave failed",
        message: error.message || "Unable to leave this event.",
      });
    } finally {
      setIsLeavingEvent(false);
    }
  };

  return (
    <div className="mint-page">
      <div className="mint-content max-w-5xl">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p
              className={`mint-label ${
                canEditEvent ? "text-blue-600" : "text-[var(--color-accent)]"
              }`}
            >
              {canEditEvent ? "Owner View" : isLocked ? "Event History" : "Event Detail"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.28px] text-[var(--color-text)] sm:text-3xl">
              {canEditEvent ? "Manage Event" : "Event Details"}
            </h1>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canLeaveEvent ? (
              <button
                type="button"
                onClick={leaveEvent}
                disabled={isLeavingEvent}
                className="inline-flex w-full items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isLeavingEvent ? "Leaving..." : "Leave Event"}
              </button>
            ) : null}
            <Link
              to={backPath}
              className="mint-pill-btn mint-btn-secondary inline-flex w-full items-center justify-center px-4 py-2 text-sm sm:w-auto"
            >
              {backLabel}
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="mint-card p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-accent-soft)] border-t-[var(--color-accent)]"></div>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              Loading event details...
            </p>
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <div className="mint-card border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="mt-4 rounded-full bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
            >
              {backLabel}
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && eventItem ? (
          <>
            <SummaryCard eventItem={eventItem} notice={notice} />

            {eventItem.permissions?.canEditEvent ? (
              isLocked ? null : (
                <div className="mt-8">
                  <EventForm
                    initialValues={eventItem}
                    heading="Edit Event"
                    subheading="Update the date range, participants, and description"
                    submitLabel="Save Changes"
                    submittingLabel="Saving..."
                    onSubmit={updateEvent}
                    onSuccess={(data) => setEventItem(data)}
                  />
                </div>
              )
            ) : null}

            <ItinerarySection
              eventItem={eventItem}
              currentUserId={currentUser?.id || ""}
              onCreateItem={createItineraryItem}
              onUpdateItem={updateItineraryItem}
              onDeleteItem={deleteItineraryItem}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
