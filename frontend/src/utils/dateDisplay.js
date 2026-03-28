const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY_PATTERN = /^(\d{2}):(\d{2})$/;

const toValidDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateOnly = (value) => {
  const match = DATE_ONLY_PATTERN.exec(String(value || "").trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
};

export const formatDisplayDate = (value, fallback = "Not available") => {
  const parsedDateOnly = parseDateOnly(value);
  if (parsedDateOnly) {
    const monthName = MONTH_NAMES[parsedDateOnly.month - 1];
    return `${String(parsedDateOnly.day).padStart(2, "0")}/${monthName}/${parsedDateOnly.year}`;
  }

  const date = toValidDate(value);
  if (!date) {
    return value || fallback;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export const formatDisplayDateTime = (
  value,
  fallback = "To be announced",
) => {
  const date = toValidDate(value);
  if (!date) {
    return value || fallback;
  }

  const formattedDate = formatDisplayDate(date);
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${formattedDate} ${formattedTime}`;
};

export const formatDisplayTime = (value, fallback = "Time not set") => {
  const match = TIME_ONLY_PATTERN.exec(String(value || "").trim());
  if (!match) {
    return value || fallback;
  }

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes} ${suffix}`;
};

export const formatDisplayDateRange = (
  startDate,
  endDate,
  fallback = "Dates not set",
) => {
  if (!startDate && !endDate) {
    return fallback;
  }

  const formattedStart = formatDisplayDate(startDate, fallback);
  const formattedEnd = formatDisplayDate(endDate, fallback);

  if (!startDate && endDate) {
    return formattedEnd;
  }

  if (startDate && !endDate) {
    return formattedStart;
  }

  if (startDate === endDate) {
    return formattedStart;
  }

  return `${formattedStart} - ${formattedEnd}`;
};
