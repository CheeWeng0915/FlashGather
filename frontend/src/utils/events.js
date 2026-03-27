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
