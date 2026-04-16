export default function EventFiltersBar({
  searchTerm,
  startDate,
  endDate,
  onSearchTermChange,
  onStartDateChange,
  onEndDateChange,
  onReset,
}) {
  const hasActiveFilters = Boolean(searchTerm.trim() || startDate || endDate);

  return (
    <div className="mint-card p-4 sm:p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(180px,1fr))_auto] xl:items-end">
        <label className="block">
          <span className="mint-label mb-2 block">
            Event Name
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#888888]">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M14.5 14.5L18 18M16.5 9A7.5 7.5 0 111.5 9a7.5 7.5 0 0115 0z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search by event name"
              autoComplete="off"
              className="mint-input mint-input-pill w-full px-10"
            />
          </div>
        </label>

        <label className="block">
          <span className="mint-label mb-2 block">
            Start Date
          </span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="mint-input mint-input-pill w-full"
          />
        </label>

        <label className="block">
          <span className="mint-label mb-2 block">
            End Date
          </span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="mint-input mint-input-pill w-full"
          />
        </label>

        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="mint-pill-btn mint-btn-secondary inline-flex h-12 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
