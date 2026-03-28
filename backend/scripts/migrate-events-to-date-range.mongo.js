// Run with:
// mongosh "mongodb://127.0.0.1:27017/FlashGather" backend/scripts/migrate-events-to-date-range.mongo.js

const dbName = 'FlashGather';
const targetDb = db.getSiblingDB(dbName);

const padDatePart = (value) => String(value).padStart(2, '0');

const toLocalDateString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join('-');
};

let updatedCount = 0;

targetDb.events.find({}).forEach((eventDoc) => {
  const nextStartDate =
    typeof eventDoc.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDoc.startDate)
      ? eventDoc.startDate
      : toLocalDateString(eventDoc.time || eventDoc.createdAt);
  const nextEndDate =
    typeof eventDoc.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDoc.endDate)
      ? eventDoc.endDate
      : toLocalDateString(eventDoc.time || eventDoc.createdAt);

  if (!nextStartDate || !nextEndDate) {
    print(`Skipped event ${eventDoc._id} because no valid fallback date was available.`);
    return;
  }

  targetDb.events.updateOne(
    { _id: eventDoc._id },
    {
      $set: {
        startDate: nextStartDate,
        endDate: nextEndDate
      }
    }
  );

  updatedCount += 1;
});

print(`Updated ${updatedCount} events with startDate/endDate.`);
