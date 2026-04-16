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
      className="mint-panel overflow-hidden"
    >
      <div className="relative overflow-hidden border-b px-5 py-6 sm:px-6 sm:py-8" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(24,226,153,0.18),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(24,226,153,0.1),_transparent_42%)]"></div>
        <div className="relative">
          <div className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand-light)] p-2.5">
            <svg
              className="h-6 w-6 text-[var(--color-brand-deep)]"
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
          <p className="mint-label mt-4">Event Form</p>
          <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.24px] text-[var(--color-text)]">{heading}</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{subheading}</p>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            required
            className="mint-input mt-2 block w-full"
            placeholder="e.g., Kuala Lumpur Company Trip"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              className="mint-input mt-2 block w-full mint-input-pill"
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
            <label className="block text-sm font-medium text-[var(--color-text)]">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              className="mint-input mt-2 block w-full mint-input-pill"
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
          <label className="block text-sm font-medium text-[var(--color-text)]">
            Description
          </label>
          <textarea
            className="mint-input mt-2 block min-h-[120px] w-full resize-y rounded-2xl"
            placeholder="What's this event about?"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">
            Participants
          </label>
          <div className="mint-card mt-2 space-y-3 p-4">
            <input
              className="mint-input block w-full mint-input-pill"
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
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
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
                        style={{ color: "var(--color-danger)" }}
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
              className="mint-pill-btn mint-btn-secondary inline-flex w-full items-center justify-center sm:w-auto"
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
          className="mint-pill-btn mint-btn-primary group relative w-full overflow-hidden py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
