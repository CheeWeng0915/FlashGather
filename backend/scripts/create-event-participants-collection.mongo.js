// Run with:
// mongosh "mongodb://127.0.0.1:27017/FlashGather" backend/scripts/create-event-participants-collection.mongo.js

const dbName = 'FlashGather';
const collectionName = 'event_participants';

const targetDb = db.getSiblingDB(dbName);
const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['eventId', 'userId', 'addedBy'],
    properties: {
      eventId: {
        bsonType: 'objectId'
      },
      userId: {
        bsonType: 'objectId'
      },
      addedBy: {
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
  print('Updated validator for event_participants collection.');
}

targetDb.event_participants.createIndex({ eventId: 1, userId: 1 }, { name: 'idx_event_participants_event_user_unique', unique: true });
targetDb.event_participants.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_event_participants_user_createdAt_desc' });
targetDb.event_participants.createIndex({ eventId: 1, createdAt: -1 }, { name: 'idx_event_participants_event_createdAt_desc' });

print('Indexes ensured for event_participants collection.');
