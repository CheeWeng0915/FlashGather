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
    <div className="mint-page">
      <div className="mint-content max-w-3xl">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mint-label">
              Event Builder
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.28px] text-[var(--color-text)] sm:text-3xl">
              Create an Event
            </h1>
          </div>
          <Link
            to={backPath}
            className="mint-pill-btn mint-btn-secondary inline-flex w-full items-center justify-center px-4 py-2 text-sm sm:w-auto"
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
