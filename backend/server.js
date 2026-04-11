const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Parcel = require('./models/Parcel');

dotenv.config();

const app = express();
const VALID_STATUSES = ['Created', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed'];
const VALID_SHIPMENT_TYPES = ['Standard', 'Express'];

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dpd-notifications';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

const createNotificationMessage = (trackingId, status, location) =>
  `Shipment ${trackingId} is now "${status}" at ${location}.`;

const createApiSuccess = (data, message) => ({
  success: true,
  message,
  data
});

const createApiError = (message, details) => ({
  success: false,
  error: {
    message,
    details
  }
});

const validateParcelPayload = payload => {
  const errors = [];

  if (!payload.receiverName?.trim()) {
    errors.push('Receiver name is required.');
  }
  if (!payload.receiverEmail?.trim()) {
    errors.push('Receiver email is required.');
  }
  if (!payload.destination?.trim()) {
    errors.push('Destination is required.');
  }
  if (!payload.location?.trim()) {
    errors.push('Location is required.');
  }
  if (payload.shipmentType && !VALID_SHIPMENT_TYPES.includes(payload.shipmentType)) {
    errors.push('Shipment type must be Standard or Express.');
  }

  return errors;
};

app.get('/api/health', (req, res) => {
  res.json(
    createApiSuccess(
      {
        service: 'dpd-parcel-tracking-system',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      },
      'Service health retrieved successfully.'
    )
  );
});

app.get('/api/parcels', async (req, res) => {
  try {
    const parcels = await Parcel.find().sort({ updatedAt: -1, createdAt: -1 });
    res.json(createApiSuccess(parcels, 'Parcels retrieved successfully.'));
  } catch (err) {
    res.status(500).json(createApiError('Unable to retrieve parcels.', err.message));
  }
});

app.get('/api/parcels/tracking/:trackingId', async (req, res) => {
  try {
    const normalizedTrackingId = req.params.trackingId.trim();
    const parcel = await Parcel.findOne({
      trackingId: { $regex: `^${normalizedTrackingId}$`, $options: 'i' }
    });

    if (!parcel) {
      return res.status(404).json(createApiError('Parcel not found.', 'Invalid tracking ID.'));
    }

    res.json(createApiSuccess(parcel, 'Parcel tracking details retrieved successfully.'));
  } catch (err) {
    res.status(500).json(createApiError('Unable to retrieve parcel tracking details.', err.message));
  }
});

app.post('/api/parcels', async (req, res) => {
  try {
    const validationErrors = validateParcelPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json(createApiError('Validation failed.', validationErrors));
    }

    const { trackingId, receiverName, receiverEmail, shipmentType, destination, location } = req.body;
    const resolvedTrackingId = trackingId?.trim() || `DPD-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    const parcel = new Parcel({
      trackingId: resolvedTrackingId,
      receiverName,
      receiverEmail,
      shipmentType: shipmentType || 'Standard',
      destination,
      location,
      status: 'Created',
      timestamp: now,
      statusHistory: [
        {
          status: 'Created',
          location,
          timestamp: now
        }
      ],
      notificationHistory: [
        {
          status: 'Created',
          channel: 'Email',
          message: createNotificationMessage(resolvedTrackingId, 'Created', location),
          sentAt: now
        }
      ]
    });

    await parcel.save();
    res.status(201).json(createApiSuccess(parcel, 'Parcel created successfully.'));
  } catch (err) {
    res.status(400).json(createApiError('Unable to create parcel.', err.message));
  }
});

app.put('/api/parcels/:id/status', async (req, res) => {
  try {
    const { status, location } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json(createApiError('Validation failed.', ['Invalid parcel status.']));
    }

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json(createApiError('Parcel not found.', 'The selected parcel does not exist.'));
    }

    const updatedLocation = location?.trim() || parcel.location;
    const now = new Date();

    parcel.status = status;
    parcel.location = updatedLocation;
    parcel.timestamp = now;
    parcel.statusHistory.push({
      status,
      location: updatedLocation,
      timestamp: now
    });
    parcel.notificationHistory.push({
      status,
      channel: 'Email',
      message: createNotificationMessage(parcel.trackingId, status, updatedLocation),
      sentAt: now
    });

    await parcel.save();

    res.json(
      createApiSuccess(
        {
          parcel,
          latestNotification: parcel.notificationHistory[parcel.notificationHistory.length - 1]
        },
        'Parcel status updated successfully.'
      )
    );
  } catch (err) {
    res.status(500).json(createApiError('Unable to update parcel status.', err.message));
  }
});

app.patch('/api/parcels/:id/location', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location?.trim()) {
      return res.status(400).json(createApiError('Validation failed.', ['Location is required.']));
    }

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json(createApiError('Parcel not found.', 'The selected parcel does not exist.'));
    }

    parcel.location = location.trim();
    parcel.timestamp = new Date();
    await parcel.save();

    res.json(createApiSuccess(parcel, 'Parcel location updated successfully.'));
  } catch (err) {
    res.status(500).json(createApiError('Unable to update parcel location.', err.message));
  }
});

app.get('/api/summary', async (req, res) => {
  try {
    const parcels = await Parcel.find();
    const deliveredParcels = parcels.filter(parcel => parcel.status === 'Delivered').length;
    const inTransitParcels = parcels.filter(
      parcel => parcel.status === 'In Transit' || parcel.status === 'Out for Delivery'
    ).length;
    const delayedParcels = parcels.filter(parcel => parcel.status === 'Delayed').length;
    const notificationsSent = parcels.reduce(
      (total, parcel) => total + parcel.notificationHistory.length,
      0
    );
    const monthlyDeliveries = parcels.reduce((accumulator, parcel) => {
      if (parcel.status !== 'Delivered') {
        return accumulator;
      }

      const monthKey = new Date(parcel.timestamp).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric'
      });
      accumulator[monthKey] = (accumulator[monthKey] || 0) + 1;
      return accumulator;
    }, {});

    res.json(
      createApiSuccess(
        {
          totalParcels: parcels.length,
          deliveredParcels,
          inTransitParcels,
          delayedParcels,
          notificationsSent,
          monthlyDeliveries
        },
        'Dashboard summary retrieved successfully.'
      )
    );
  } catch (err) {
    res.status(500).json(createApiError('Unable to retrieve dashboard summary.', err.message));
  }
});

const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api\/?).*/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
