import { Link, useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm";
import { API_BASE } from "../config";
import { getAuthHeaders, getStoredUserRole } from "../utils/auth";

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

export default function NewEvent() {
  const navigate = useNavigate();
  const isAdmin = getStoredUserRole() === "admin";
  const backPath = isAdmin ? "/events" : "/my-events";

  const createEvent = async (payload) => {
    const response = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await readApiError(response, "Unable to create event.");
    }

    return response.json();
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Event Builder
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Create an Event
            </h1>
          </div>
          <Link
            to={backPath}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto"
          >
            {isAdmin ? "Back to Events" : "Back to My Events"}
          </Link>
        </div>

        <EventForm
          heading="Create New Event"
          subheading="Set the date range and invite participants"
          submitLabel="Create Event"
          submittingLabel="Creating..."
          onSubmit={createEvent}
          onSuccess={() => navigate(backPath)}
        />
      </div>
    </div>
  );
}
