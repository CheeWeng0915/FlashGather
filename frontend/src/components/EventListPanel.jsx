import { isPastEvent } from "../utils/events";
import { formatDisplayDateTime } from "../utils/dateDisplay";

const formatEventTime = (value) => {
  if (!value) {
    return "To be announced";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDisplayDateTime(date);
};

export default function EventListPanel({
  events,
  heading,
  summary,
  emptyMessage,
  toolbar = null,
  onOpen,
  onDelete,
  isAdmin,
}) {
  return (
    <section className="mt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{heading}</h2>
          <p className="mt-1 text-sm text-slate-500">{summary}</p>
        </div>
        {toolbar}
      </div>

      {events.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-blue-50/50"></div>
          <div className="relative">
            <svg
              className="mx-auto h-16 w-16 text-slate-400"
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
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No events yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
          </div>
        </div>
      ) : null}

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((eventItem) => {
          const isLockedPastEvent = isAdmin && isPastEvent(eventItem);

          return (
            <li
              key={eventItem.id || eventItem._id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
            >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>

            <div className="absolute right-5 top-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
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

            <h3 className="pr-16 text-xl font-bold leading-tight text-slate-900">
              {eventItem.title}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              {eventItem.description}
            </p>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Time
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {formatEventTime(eventItem.time)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg
                    className="h-4 w-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {eventItem.location || "To be announced"}
                  </dd>
                </div>
              </div>
            </dl>

              <div className="relative z-10 mt-6 flex gap-2">
                {isAdmin ? (
                  isLockedPastEvent ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpen(eventItem)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        disabled
                        className="flex-1 cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
                      >
                        Past Event
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpen(eventItem)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(eventItem)}
                        className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(eventItem)}
                    className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                  >
                    View Details
                  </button>
                )}
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-blue-500/0 transition-opacity group-hover:from-emerald-500/5 group-hover:to-blue-500/5"></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
