import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EventForm from "../components/EventForm";
import { API_BASE } from "../config";
import { getAuthHeaders } from "../utils/auth";

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

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventItem, setEventItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
  }, [eventId]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Event Detail
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Edit Event
            </h1>
          </div>
          <Link
            to="/"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Back to Home
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
            <p className="mt-4 text-sm text-slate-600">Loading event details...</p>
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
            >
              Return to Events
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && eventItem ? (
          <EventForm
            initialValues={eventItem}
            heading="Edit Event"
            subheading="Update the details and save your changes"
            submitLabel="Save Changes"
            submittingLabel="Saving..."
            onSubmit={updateEvent}
            onSuccess={() => navigate("/")}
          />
        ) : null}
      </div>
    </div>
  );
}
