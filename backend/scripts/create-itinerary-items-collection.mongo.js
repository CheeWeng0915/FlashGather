// Run with:
// mongosh "mongodb://127.0.0.1:27017/FlashGather" backend/scripts/create-itinerary-items-collection.mongo.js

const dbName = 'FlashGather';
const collectionName = 'itinerary_items';

const targetDb = db.getSiblingDB(dbName);
const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['eventId', 'date', 'time', 'location', 'createdBy'],
    properties: {
      eventId: {
        bsonType: 'objectId'
      },
      date: {
        bsonType: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$'
      },
      time: {
        bsonType: 'string',
        pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$'
      },
      location: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 200
      },
      lat: {
        bsonType: ['double', 'decimal', 'int', 'long', 'null'],
        minimum: -90,
        maximum: 90
      },
      lng: {
        bsonType: ['double', 'decimal', 'int', 'long', 'null'],
        minimum: -180,
        maximum: 180
      },
      notes: {
        bsonType: ['string', 'null'],
        maxLength: 1000
      },
      createdBy: {
        bsonType: 'objectId'
      },
      createdAt: {
        bsonType: ['date', 'null']
      },
      updatedAt: {
        bsonType: ['date', 'null']
      }
    }
  }
};

const existing = targetDb.getCollectionNames();
if (!existing.includes(collectionName)) {
  targetDb.createCollection(collectionName, {
    validator,
    validationLevel: 'moderate',
    validationAction: 'error'
  });

  print(`Created collection: ${dbName}.${collectionName}`);
} else {
  print(`Collection already exists: ${dbName}.${collectionName}`);
  targetDb.runCommand({
    collMod: collectionName,
    validator,
    validationLevel: 'moderate',
    validationAction: 'error'
  });
  print('Updated validator for itinerary_items collection.');
}

targetDb.itinerary_items.createIndex(
  { eventId: 1, date: 1, time: 1, createdAt: 1 },
  { name: 'idx_itinerary_event_date_time_createdAt' }
);
targetDb.itinerary_items.createIndex({ createdBy: 1, createdAt: -1 }, { name: 'idx_itinerary_createdBy_createdAt_desc' });

print('Indexes ensured for itinerary_items collection.');
