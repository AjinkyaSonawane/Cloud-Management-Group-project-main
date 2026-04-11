const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      default: 'Email'
    },
    message: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const parcelSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    receiverName: {
      type: String,
      required: true,
      trim: true
    },
    receiverEmail: {
      type: String,
      required: true,
      trim: true
    },
    shipmentType: {
      type: String,
      enum: ['Standard', 'Express'],
      default: 'Standard'
    },
    destination: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Created', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed'],
      default: 'Created'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    notificationHistory: {
      type: [notificationSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Parcel', parcelSchema);
