const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const padDatePart = (value) => String(value).padStart(2, "0");

const toLocalDateString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};

const normalizeDateValue = (value) => {
  const normalized = String(value || "").trim();
  if (DATE_ONLY_PATTERN.test(normalized)) {
    return normalized;
  }

  return toLocalDateString(value);
};

const normalizeEventSearch = (value) => String(value || "").trim().toLowerCase();

const compareAscendingDate = (left, right) => {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right);
};

const compareDescendingDate = (left, right) => compareAscendingDate(right, left);

export const getTodayDateString = () => toLocalDateString(new Date());

export const getEventDateRange = (eventItem) => {
  const startDate = normalizeDateValue(eventItem?.startDate || eventItem?.time);
  const endDate = normalizeDateValue(eventItem?.endDate || eventItem?.time);

  return {
    startDate,
    endDate,
  };
};

export const isPastEvent = (value) => {
  const { endDate } =
    value && typeof value === "object" ? getEventDateRange(value) : { endDate: normalizeDateValue(value) };

  if (!endDate) {
    return false;
  }

  return endDate < getTodayDateString();
};

export const hasActiveEventFilters = ({
  searchTerm = "",
  startDate = "",
  endDate = "",
} = {}) => Boolean(normalizeEventSearch(searchTerm) || startDate || endDate);

export const filterEventsByCriteria = (events, criteria = {}) => {
  const normalizedSearch = normalizeEventSearch(criteria.searchTerm);
  const filterStart = normalizeDateValue(criteria.startDate);
  const filterEnd = normalizeDateValue(criteria.endDate);
  const hasDateFilter = Boolean(filterStart || filterEnd);

  return (Array.isArray(events) ? events : []).filter((eventItem) => {
    if (normalizedSearch) {
      const title = normalizeEventSearch(eventItem?.title);
      if (!title.includes(normalizedSearch)) {
        return false;
      }
    }

    if (!hasDateFilter) {
      return true;
    }

    const { startDate, endDate } = getEventDateRange(eventItem);
    if (!startDate || !endDate) {
      return false;
    }

    if (filterStart && endDate < filterStart) {
      return false;
    }

    if (filterEnd && startDate > filterEnd) {
      return false;
    }

    return true;
  });
};

const compareAscendingByDateRange = (left, right) => {
  const leftRange = getEventDateRange(left);
  const rightRange = getEventDateRange(right);
  const startComparison = compareAscendingDate(leftRange.startDate, rightRange.startDate);

  if (startComparison !== 0) {
    return startComparison;
  }

  const endComparison = compareAscendingDate(leftRange.endDate, rightRange.endDate);
  if (endComparison !== 0) {
    return endComparison;
  }

  return String(left?.title || "").localeCompare(String(right?.title || ""));
};

const compareDescendingByDateRange = (left, right) => {
  const leftRange = getEventDateRange(left);
  const rightRange = getEventDateRange(right);
  const endComparison = compareDescendingDate(leftRange.endDate, rightRange.endDate);

  if (endComparison !== 0) {
    return endComparison;
  }

  const startComparison = compareDescendingDate(leftRange.startDate, rightRange.startDate);
  if (startComparison !== 0) {
    return startComparison;
  }

  return String(left?.title || "").localeCompare(String(right?.title || ""));
};

export const sortEventsByTimeline = (events, { descending = false } = {}) =>
  [...(Array.isArray(events) ? events : [])].sort(
    descending ? compareDescendingByDateRange : compareAscendingByDateRange,
  );

export const splitEventsByTimeline = (events) => {
  const upcomingEvents = [];
  const historyEvents = [];

  for (const eventItem of Array.isArray(events) ? events : []) {
    if (isPastEvent(eventItem)) {
      historyEvents.push(eventItem);
    } else {
      upcomingEvents.push(eventItem);
    }
  }

  upcomingEvents.sort(compareAscendingByDateRange);
  historyEvents.sort(compareDescendingByDateRange);

  return { upcomingEvents, historyEvents };
};
