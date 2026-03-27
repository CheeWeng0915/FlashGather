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

const toValidDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDisplayDate = (value, fallback = "Not available") => {
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
