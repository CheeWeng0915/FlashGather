import { formatDisplayDateRange } from "../utils/dateDisplay";
import { getEventDateRange, isPastEvent } from "../utils/events";

export default function EventListPanel({
  events,
  heading,
  summary,
  emptyMessage,
  filters = null,
  toolbar = null,
  onOpen,
  onDelete,
  onLeave,
  leavingEventId = "",
  showManageActions = false,
}) {
  return (
    <section className="mt-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mint-label">Events</p>
          <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.24px] text-[var(--color-text)]">
            {heading}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{summary}</p>
        </div>
        {toolbar}
      </div>

      {filters ? <div className="mb-6">{filters}</div> : null}

      {events.length === 0 ? (
        <div className="mint-card p-8 text-center sm:p-12">
          <div>
            <svg
              className="mx-auto h-16 w-16 text-[#888888]"
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
            <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
              No events yet
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
          </div>
        </div>
      ) : null}

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((eventItem) => {
          const isLockedPastEvent = showManageActions && isPastEvent(eventItem);
          const { startDate, endDate } = getEventDateRange(eventItem);
          const ownerLabel = eventItem.owner?.username || "Unknown owner";
          const canLeaveEvent =
            typeof onLeave === "function" && !showManageActions && !isPastEvent(eventItem);
          const currentEventId = eventItem.id || eventItem._id;

          return (
            <li
              key={eventItem.id || eventItem._id}
              className="group mint-card relative overflow-hidden p-6 transition-all hover:border-[var(--color-border-medium)]"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[var(--color-brand)] opacity-70"></div>

              <div className="absolute right-5 top-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-light)] px-3 py-1 text-xs font-medium text-[var(--color-brand-deep)]">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  {eventItem.participantCount || 0}
                </span>
              </div>

              <h3 className="pr-16 text-xl font-semibold tracking-[-0.2px] text-[var(--color-text)]">
                {eventItem.title}
              </h3>
              <p className="mt-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                {eventItem.description || "No description added yet."}
              </p>

              <dl className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-muted)]">
                    <svg
                      className="h-4 w-4 text-[var(--color-text-muted)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="mint-label">
                      Event Dates
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-[var(--color-text)]">
                      {formatDisplayDateRange(startDate, endDate)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-muted)]">
                    <svg
                      className="h-4 w-4 text-[var(--color-text-muted)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.121 17.804A9 9 0 1118.88 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="mint-label">
                      Owner
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-[var(--color-text)]">
                      {ownerLabel}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="relative z-10 mt-6 flex flex-col gap-2 sm:flex-row">
                {showManageActions ? (
                  isLockedPastEvent ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpen(eventItem)}
                        className="mint-pill-btn mint-btn-secondary flex-1 px-3 py-2 text-xs"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        disabled
                        className="flex-1 cursor-not-allowed rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)]"
                      >
                        Past Event
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpen(eventItem)}
                        className="mint-pill-btn mint-btn-secondary flex-1 px-3 py-2 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(eventItem)}
                        className="mint-pill-btn mint-btn-danger flex-1 px-3 py-2 text-xs"
                      >
                        Delete
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpen(eventItem)}
                      className={`${canLeaveEvent ? "flex-1" : "w-full"} mint-pill-btn mint-btn-primary px-3 py-2 text-xs`}
                    >
                      View Details
                    </button>
                    {canLeaveEvent ? (
                      <button
                        type="button"
                        onClick={() => onLeave(eventItem)}
                        disabled={leavingEventId === currentEventId}
                        className="mint-pill-btn mint-btn-secondary flex-1 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {leavingEventId === currentEventId ? "Leaving..." : "Leave"}
                      </button>
                    ) : null}
                  </>
                )}
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent transition group-hover:border-[var(--color-border-medium)]"></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
