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

const formatUptime = totalSeconds => {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return [days ? `${days}d` : null, hours ? `${hours}h` : null, minutes ? `${minutes}m` : null, `${seconds}s`]
    .filter(Boolean)
    .join(' ');
};

const getHealthPayload = () => ({
  service: 'dpd-parcel-tracking-system',
  status: 'ok',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  environment: process.env.NODE_ENV || 'development',
  uptime: formatUptime(process.uptime()),
  timestamp: new Date().toISOString()
});

const renderHealthPage = health => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Service Health</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Arial, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(217, 72, 15, 0.18), transparent 28%),
          linear-gradient(180deg, #fdf4ec 0%, #f8fbff 48%, #eef5ff 100%);
        color: #0f172a;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .health-shell {
        width: min(760px, 100%);
        padding: 32px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
      }

      .eyebrow {
        margin: 0 0 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.78rem;
        font-weight: 700;
        color: #d9480f;
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 4vw, 3rem);
      }

      .subcopy {
        margin: 0 0 24px;
        color: #475569;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #047857;
        font-weight: 700;
        margin-bottom: 24px;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #10b981;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }

      .metric-card {
        padding: 18px;
        border-radius: 20px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .metric-label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
      }

      .metric-value {
        font-size: 1.05rem;
        font-weight: 700;
        word-break: break-word;
      }

      .code-block {
        margin-top: 22px;
        padding: 18px;
        border-radius: 18px;
        background: #0f172a;
        color: #dbeafe;
        overflow-x: auto;
        font-size: 0.92rem;
      }
    </style>
  </head>
  <body>
    <main class="health-shell">
      <p class="eyebrow">DPD Ireland Azure Modernization Case Study</p>
      <h1>Service Health</h1>
      <p class="subcopy">The parcel tracking API is online and responding successfully.</p>

      <div class="status-pill">
        <span class="status-dot"></span>
        Status: ${health.status.toUpperCase()}
      </div>

      <section class="metrics">
        <article class="metric-card">
          <span class="metric-label">Service</span>
          <span class="metric-value">${health.service}</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Database</span>
          <span class="metric-value">${health.database}</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Environment</span>
          <span class="metric-value">${health.environment}</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Uptime</span>
          <span class="metric-value">${health.uptime}</span>
        </article>
      </section>

      <pre class="code-block">${JSON.stringify(health, null, 2)}</pre>
    </main>
  </body>
</html>`;

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
  const health = getHealthPayload();

  if (req.accepts('html') && !req.accepts('json')) {
    return res.send(renderHealthPage(health));
  }

  res.json(createApiSuccess(health, 'Service health retrieved successfully.'));
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

const frontendDistCandidates = [
  path.resolve(__dirname, 'dist'),
  path.resolve(__dirname, '../frontend/dist')
];

const resolvedFrontendDistPath = frontendDistCandidates.find(candidate =>
  fs.existsSync(path.join(candidate, 'index.html'))
);

if (resolvedFrontendDistPath) {
  const frontendIndexPath = path.join(resolvedFrontendDistPath, 'index.html');

  app.use(express.static(resolvedFrontendDistPath));

  app.get(/^\/(?!api\/?).*/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
