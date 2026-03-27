const mongoose = require('mongoose');

const EventParticipantSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'event_participants'
  }
);

EventParticipantSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('EventParticipant', EventParticipantSchema);
