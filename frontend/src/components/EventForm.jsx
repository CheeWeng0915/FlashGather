import { useEffect, useState } from "react";
import { getStoredUser } from "../utils/auth";

const EMPTY_FORM = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  participantEmailInput: "",
  participantEmails: [],
};

const PARTICIPANT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeParticipantEmail = (value) =>
  String(value || "").trim().toLowerCase();

const dedupeParticipantEmails = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const seen = new Set();

  return values.reduce((emails, value) => {
    const normalizedValue = normalizeParticipantEmail(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return emails;
    }

    seen.add(normalizedValue);
    emails.push(normalizedValue);
    return emails;
  }, []);
};

const parseParticipantEmailInput = (value) =>
  dedupeParticipantEmails(
    String(value || "")
      .split(/[\n,;]+/)
      .map((item) => item.trim()),
  );

const ensureOwnerIncluded = (emails, ownerEmail) => {
  const normalizedOwnerEmail = normalizeParticipantEmail(ownerEmail);
  const normalizedEmails = dedupeParticipantEmails(emails);

  if (!normalizedOwnerEmail) {
    return normalizedEmails;
  }

  return normalizedEmails.includes(normalizedOwnerEmail)
    ? normalizedEmails
    : [normalizedOwnerEmail, ...normalizedEmails];
};

const resolveParticipantEmails = (existingEmails, rawValue, ownerEmail) => {
  const nextExistingEmails = ensureOwnerIncluded(existingEmails, ownerEmail);
  const parsedEmails = parseParticipantEmailInput(rawValue);

  if (parsedEmails.length === 0) {
    return { emails: nextExistingEmails, parsedEmails: [] };
  }

  const invalidEmails = parsedEmails.filter(
    (email) => !PARTICIPANT_EMAIL_PATTERN.test(email),
  );

  if (invalidEmails.length > 0) {
    return {
      emails: nextExistingEmails,
      parsedEmails,
      error:
        invalidEmails.length === 1
          ? `Enter a valid email address: ${invalidEmails[0]}`
          : `Enter valid email addresses: ${invalidEmails.join(", ")}`,
    };
  }

  return {
    emails: ensureOwnerIncluded(
      [...nextExistingEmails, ...parsedEmails],
      ownerEmail,
    ),
    parsedEmails,
  };
};

const buildFormState = (initialValues) => {
  const storedUser = getStoredUser();
  const ownerEmail =
    initialValues?.owner?.email || storedUser?.email || "";

  return {
    title: initialValues?.title ?? EMPTY_FORM.title,
    description: initialValues?.description ?? EMPTY_FORM.description,
    startDate: initialValues?.startDate ?? EMPTY_FORM.startDate,
    endDate: initialValues?.endDate ?? EMPTY_FORM.endDate,
    participantEmailInput: EMPTY_FORM.participantEmailInput,
    participantEmails: ensureOwnerIncluded(
      initialValues?.participantEmails ??
        (ownerEmail ? [ownerEmail] : EMPTY_FORM.participantEmails),
      ownerEmail,
    ),
  };
};

export default function EventForm({
  initialValues,
  heading,
  subheading,
  submitLabel,
  submittingLabel,
  onSubmit,
  onSuccess = () => {},
}) {
  const storedUser = getStoredUser();
  const ownerEmail =
    initialValues?.owner?.email || storedUser?.email || "";
  const [form, setForm] = useState(() => buildFormState(initialValues));
  const [participantEmailError, setParticipantEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(buildFormState(initialValues));
    setParticipantEmailError("");
  }, [initialValues]);

  const handleParticipantInputChange = (value) => {
    setParticipantEmailError("");
    setForm((prev) => ({
      ...prev,
      participantEmailInput: value,
    }));
  };

  const handleAddParticipant = () => {
    const result = resolveParticipantEmails(
      form.participantEmails,
      form.participantEmailInput,
      ownerEmail,
    );

    if (result.error) {
      setParticipantEmailError(result.error);
      return;
    }

    if (result.parsedEmails.length === 0) {
      setParticipantEmailError("Enter at least one participant email.");
      return;
    }

    if (result.emails.length === form.participantEmails.length) {
      setParticipantEmailError("That participant is already added.");
      return;
    }

    setParticipantEmailError("");
    setForm((prev) => ({
      ...prev,
      participantEmailInput: "",
      participantEmails: result.emails,
    }));
  };

  const handleRemoveParticipant = (emailToRemove) => {
    const normalizedOwnerEmail = normalizeParticipantEmail(ownerEmail);
    if (normalizeParticipantEmail(emailToRemove) === normalizedOwnerEmail) {
      setParticipantEmailError("The event owner must remain in the participant list.");
      return;
    }

    setParticipantEmailError("");
    setForm((prev) => ({
      ...prev,
      participantEmails: prev.participantEmails.filter(
        (email) => email !== emailToRemove,
      ),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.startDate || !form.endDate) {
      alert("Please select both a start date and an end date.");
      return;
    }

    if (form.startDate > form.endDate) {
      alert("Start date must be earlier than or equal to end date.");
      return;
    }

    const participantResult = resolveParticipantEmails(
      form.participantEmails,
      form.participantEmailInput,
      ownerEmail,
    );

    if (participantResult.error) {
      setParticipantEmailError(participantResult.error);
      return;
    }

    setIsSubmitting(true);
    setParticipantEmailError("");

    if (participantResult.parsedEmails.length > 0) {
      setForm((prev) => ({
        ...prev,
        participantEmailInput: "",
        participantEmails: participantResult.emails,
      }));
    }

    const payload = {
      title: form.title.trim(),
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      participantEmails: participantResult.emails,
    };

    try {
      const data = await onSubmit(payload);
      onSuccess(data);
    } catch (error) {
      alert(error?.message || "Unable to save event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-blue-600 px-5 py-6 sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative">
          <div className="inline-flex items-center justify-center rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">{heading}</h2>
          <p className="mt-1 text-sm text-emerald-50">{subheading}</p>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            required
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            placeholder="e.g., Kuala Lumpur Company Trip"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              value={form.startDate}
              max={form.endDate || undefined}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  endDate: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Description
          </label>
          <textarea
            className="mt-2 block min-h-[120px] w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            placeholder="What's this event about?"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Participants
          </label>
          <div className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              placeholder="Enter participant email"
              value={form.participantEmailInput}
              onChange={(event) =>
                handleParticipantInputChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddParticipant();
                }
              }}
            />

            {form.participantEmails.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.participantEmails.map((email) => {
                  const isOwnerEmail =
                    normalizeParticipantEmail(email) ===
                    normalizeParticipantEmail(ownerEmail);

                  return (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                    >
                      {email}
                      {isOwnerEmail ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                          Owner
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Remove ${email}`}
                        onClick={() => handleRemoveParticipant(email)}
                        disabled={isOwnerEmail}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleAddParticipant}
              className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20 sm:w-auto"
            >
              Add Participant
            </button>
          </div>
          <p
            className={`mt-2 text-xs ${
              participantEmailError ? "text-red-600" : "text-slate-500"
            }`}
          >
            {participantEmailError ||
              "Only registered users can be added. The event owner always stays in the participant list."}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <span className="relative flex items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
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
                {submittingLabel}
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5 transition-transform group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {submitLabel}
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
