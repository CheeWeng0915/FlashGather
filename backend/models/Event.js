const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    startDate: {
      type: String,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      default: null
    },
    endDate: {
      type: String,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      default: null
    },
    // Legacy fields retained for migration compatibility.
    time: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rsvps: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
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

module.exports = mongoose.model('Event', EventSchema);
