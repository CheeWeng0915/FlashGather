const getEventDate = (value) => {
  const rawValue =
    value && typeof value === "object" && "time" in value ? value.time : value;

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const isPastEvent = (value) => {
  const date = getEventDate(value);
  if (!date) {
    return false;
  }

  return date < getStartOfToday();
};

const normalizeEventSearch = (value) => String(value || "").trim().toLowerCase();

const parseDateInputValue = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!match) {
    return null;
  }

  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
};

export const hasActiveEventFilters = ({
  searchTerm = "",
  startDate = "",
  endDate = "",
} = {}) => Boolean(normalizeEventSearch(searchTerm) || startDate || endDate);

export const filterEventsByCriteria = (events, criteria = {}) => {
  const normalizedSearch = normalizeEventSearch(criteria.searchTerm);
  const startBoundary = parseDateInputValue(criteria.startDate);
  const endBoundary = parseDateInputValue(criteria.endDate, true);
  const hasDateFilter = Boolean(startBoundary || endBoundary);

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

    const eventDate = getEventDate(eventItem);
    if (!eventDate) {
      return false;
    }

    if (startBoundary && eventDate < startBoundary) {
      return false;
    }

    if (endBoundary && eventDate > endBoundary) {
      return false;
    }

    return true;
  });
};

const compareAscendingByTime = (left, right) => {
  const leftDate = getEventDate(left);
  const rightDate = getEventDate(right);

  if (!leftDate && !rightDate) {
    return 0;
  }

  if (!leftDate) {
    return 1;
  }

  if (!rightDate) {
    return -1;
  }

  return leftDate.getTime() - rightDate.getTime();
};

const compareDescendingByTime = (left, right) =>
  compareAscendingByTime(right, left);

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

  upcomingEvents.sort(compareAscendingByTime);
  historyEvents.sort(compareDescendingByTime);

  return { upcomingEvents, historyEvents };
};
