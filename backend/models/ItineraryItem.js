const mongoose = require('mongoose');

const ItineraryItemSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    date: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    time: {
      type: String,
      required: true,
      trim: true,
      match: /^(?:[01]\d|2[0-3]):[0-5]\d$/
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    lat: {
      type: Number,
      min: -90,
      max: 90,
      default: null
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'itinerary_items',
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      }
    }
  }
);

ItineraryItemSchema.index(
  { eventId: 1, date: 1, time: 1, createdAt: 1 },
  { name: 'idx_itinerary_event_date_time_createdAt' }
);

module.exports = mongoose.model('ItineraryItem', ItineraryItemSchema);
