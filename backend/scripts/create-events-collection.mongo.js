// Run with:
// mongosh "mongodb://127.0.0.1:27017/FlashGather" backend/scripts/create-events-collection.mongo.js

const dbName = 'FlashGather';
const collectionName = 'events';

const targetDb = db.getSiblingDB(dbName);
const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['title'],
    properties: {
      title: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 120,
        description: 'Event title is required and must be 1-120 chars'
      },
      description: {
        bsonType: ['string', 'null'],
        maxLength: 1000
      },
      time: {
        bsonType: ['date', 'null']
      },
      location: {
        bsonType: ['string', 'null'],
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
      capacity: {
        bsonType: ['int', 'long', 'double', 'decimal', 'null'],
        minimum: 1
      },
      userId: {
        bsonType: ['objectId', 'null']
      },
      rsvps: {
        bsonType: ['array'],
        items: {
          bsonType: 'objectId'
        }
      },
      createdBy: {
        bsonType: ['objectId', 'null']
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
  print('Updated validator for events collection.');
}

targetDb.events.createIndex({ createdAt: -1 }, { name: 'idx_events_createdAt_desc' });
targetDb.events.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_events_userId_createdAt_desc' });
targetDb.events.createIndex({ time: 1 }, { name: 'idx_events_time_asc' });
targetDb.events.createIndex({ lat: 1, lng: 1 }, { name: 'idx_events_lat_lng' });
targetDb.events.createIndex({ title: 'text', description: 'text' }, { name: 'idx_events_text_search' });

print('Indexes ensured for events collection.');
