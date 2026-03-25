// Run with:
// mongosh "mongodb://127.0.0.1:27017/FlashGather" backend/scripts/create-users-collection.mongo.js
//
// For MongoDB Atlas, use your Atlas connection string instead:
// mongosh "mongodb+srv://<username>:<password>@<cluster-url>/FlashGather" backend/scripts/create-users-collection.mongo.js

const dbName = 'FlashGather';
const collectionName = 'users';

const targetDb = db.getSiblingDB(dbName);

const existing = targetDb.getCollectionNames();
if (!existing.includes(collectionName)) {
  targetDb.createCollection(collectionName, {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: {
            bsonType: 'string',
            minLength: 1,
            maxLength: 60,
            description: 'Username is required and must be 1-60 chars'
          },
          email: {
            bsonType: 'string',
            minLength: 3,
            maxLength: 160,
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            description: 'Email is required and must be a valid email address'
          },
          password: {
            bsonType: 'string',
            minLength: 20,
            maxLength: 200,
            description: 'Password hash is required'
          },
          createdAt: {
            bsonType: ['date', 'null']
          },
          updatedAt: {
            bsonType: ['date', 'null']
          }
        }
      }
    },
    validationLevel: 'moderate',
    validationAction: 'error'
  });

  print(`Created collection: ${dbName}.${collectionName}`);
} else {
  print(`Collection already exists: ${dbName}.${collectionName}`);
}

targetDb.users.createIndex({ username: 1 }, { name: 'idx_users_username_unique', unique: true });
targetDb.users.createIndex({ email: 1 }, { name: 'idx_users_email_unique', unique: true });
targetDb.users.createIndex({ createdAt: -1 }, { name: 'idx_users_createdAt_desc' });

print('Indexes ensured for users collection.');
