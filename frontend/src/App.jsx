import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim();
const buildApiUrl = path => `${API_BASE_URL}${path}`;
const STATUS_OPTIONS = ['Created', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed'];

const initialForm = {
  trackingId: '',
  receiverName: '',
  receiverEmail: '',
  shipmentType: 'Standard',
  destination: '',
  location: 'Athlone Hub'
};

const getErrorMessage = error =>
  error?.response?.data?.error?.details?.join?.(', ') ||
  error?.response?.data?.error?.message ||
  'Something went wrong.';

function App() {
  const [parcels, setParcels] = useState([]);
  const [summary, setSummary] = useState({
    totalParcels: 0,
    deliveredParcels: 0,
    inTransitParcels: 0,
    delayedParcels: 0,
    notificationsSent: 0,
    monthlyDeliveries: {}
  });
  const [formData, setFormData] = useState(initialForm);
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackedParcel, setTrackedParcel] = useState(null);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [latestNotificationMessage, setLatestNotificationMessage] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [parcelResponse, summaryResponse] = await Promise.all([
        axios.get(buildApiUrl('/api/parcels')),
        axios.get(buildApiUrl('/api/summary'))
      ]);

      const parcelList = parcelResponse.data.data;
      setParcels(parcelList);
      setSummary(summaryResponse.data.data);
      setSelectedParcelId(current => current || parcelList[0]?._id || '');
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleFormChange = event => {
    setFormData(current => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleCreateParcel = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await axios.post(buildApiUrl('/api/parcels'), formData);
      setSuccessMessage(response.data.message);
      setLatestNotificationMessage(response.data.data.notificationHistory.at(-1)?.message || '');
      setFormData(initialForm);
      await fetchDashboard();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (parcelId, status) => {
    const targetParcel = parcels.find(parcel => parcel._id === parcelId);
    if (!targetParcel) {
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      const response = await axios.put(buildApiUrl(`/api/parcels/${parcelId}/status`), {
        status,
        location: targetParcel.location
      });
      setSuccessMessage(response.data.message);
      setLatestNotificationMessage(response.data.data.latestNotification.message);
      await fetchDashboard();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const handleLocationBlur = async (parcelId, location) => {
    try {
      await axios.patch(buildApiUrl(`/api/parcels/${parcelId}/location`), { location });
      await fetchDashboard();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const handleTrackParcel = async event => {
    event.preventDefault();
    setError('');
    setTrackedParcel(null);

    try {
      const response = await axios.get(
        buildApiUrl(`/api/parcels/tracking/${trackingSearch.trim()}`)
      );
      setTrackedParcel(response.data.data);
      setSuccessMessage('Tracking details loaded successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const selectedParcel = parcels.find(parcel => parcel._id === selectedParcelId) || null;
  const latestNotifications = parcels
    .flatMap(parcel =>
      parcel.notificationHistory.map(notification => ({
        ...notification,
        trackingId: parcel.trackingId,
        receiverName: parcel.receiverName
      }))
    )
    .sort((left, right) => new Date(right.sentAt) - new Date(left.sentAt))
    .slice(0, 8);

  const monthlyDeliveries = Object.entries(summary.monthlyDeliveries || {});

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">DPD Ireland Azure Modernization Case Study</p>
          <h1>Cloud-Native Customer Notification Platform</h1>
          <p className="hero-copy">
            This prototype demonstrates how DPD Ireland can replace delayed, on-premise
            polling with an Azure-based, event-driven customer notification service for
            near real-time parcel updates.
          </p>
        </div>
        <div className="hero-aside">
          <div className="highlight-card">
            <span className="highlight-label">Current Problem</span>
            <p>
              Batch polling every 30 to 60 minutes creates notification lag, poor tracking
              visibility, and service degradation during seasonal volume spikes.
            </p>
          </div>
          <div className="highlight-card">
            <span className="highlight-label">Azure Outcome</span>
            <p>
              An event-driven Azure platform using API Management, Service Bus, Azure
              Functions, and Communication Services for resilient real-time updates.
            </p>
          </div>
        </div>
      </section>

      {error ? <div className="message-banner error">{error}</div> : null}
      {successMessage ? <div className="message-banner success">{successMessage}</div> : null}
      {latestNotificationMessage ? (
        <div className="message-banner info">Latest notification: {latestNotificationMessage}</div>
      ) : null}

      <section className="summary-grid">
        <article className="metric-card">
          <span>Total Parcels</span>
          <strong>{summary.totalParcels}</strong>
        </article>
        <article className="metric-card">
          <span>Delivered Parcels</span>
          <strong>{summary.deliveredParcels}</strong>
        </article>
        <article className="metric-card">
          <span>In-Transit Parcels</span>
          <strong>{summary.inTransitParcels}</strong>
        </article>
        <article className="metric-card warning">
          <span>Delayed Parcels</span>
          <strong>{summary.delayedParcels}</strong>
        </article>
        <article className="metric-card accent">
          <span>Notification Log Entries</span>
          <strong>{summary.notificationsSent}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Parcel Event Intake</p>
              <h2>Simulate a parcel entering the event-driven pipeline</h2>
            </div>
          </div>

          <form className="parcel-form" onSubmit={handleCreateParcel}>
            <label>
              Tracking ID
              <input
                name="trackingId"
                value={formData.trackingId}
                onChange={handleFormChange}
                placeholder="Leave blank to auto-generate"
              />
            </label>
            <label>
              Receiver Name
              <input
                name="receiverName"
                value={formData.receiverName}
                onChange={handleFormChange}
                required
                placeholder="Aisling Byrne"
              />
            </label>
            <label>
              Receiver Email
              <input
                name="receiverEmail"
                type="email"
                value={formData.receiverEmail}
                onChange={handleFormChange}
                required
                placeholder="aisling@example.com"
              />
            </label>
            <label>
              Shipment Type
              <select
                name="shipmentType"
                value={formData.shipmentType}
                onChange={handleFormChange}
              >
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
              </select>
            </label>
            <label>
              Destination
              <input
                name="destination"
                value={formData.destination}
                onChange={handleFormChange}
                required
                placeholder="Dublin Distribution Centre"
              />
            </label>
            <label>
              Current Location
              <input
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                required
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Parcel'}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Customer Tracking View</p>
              <h2>Search by tracking ID for real-time parcel status</h2>
            </div>
          </div>

          <form className="tracking-form" onSubmit={handleTrackParcel}>
            <input
              value={trackingSearch}
              onChange={event => setTrackingSearch(event.target.value)}
              placeholder="Enter tracking ID"
            />
            <button type="submit">Track Shipment</button>
          </form>

          <div className="tracking-card">
            {trackedParcel ? (
              <>
                <div className="tracking-header">
                  <div>
                    <p className="tracking-id">{trackedParcel.trackingId}</p>
                    <h3>{trackedParcel.receiverName}</h3>
                  </div>
                  <span className={`pill ${trackedParcel.shipmentType === 'Express' ? 'express' : ''}`}>
                    {trackedParcel.shipmentType}
                  </span>
                </div>
                <p className="tracking-meta">
                  Status: <strong>{trackedParcel.status}</strong>
                </p>
                <p className="tracking-meta">
                  Latest location: <strong>{trackedParcel.location}</strong>
                </p>
                <div className="history-list">
                  {trackedParcel.statusHistory.map((entry, index) => (
                    <div key={`${entry.status}-${entry.timestamp}-${index}`} className="history-item">
                      <strong>{entry.status}</strong>
                      <span>{entry.location}</span>
                      <small>{new Date(entry.timestamp).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                Enter a tracking ID to view shipment status and history.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="content-grid lower-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Operations Control</p>
              <h2>Trigger live parcel events and status changes</h2>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading parcel records...</div>
          ) : parcels.length === 0 ? (
            <div className="empty-state">No parcels found yet. Create one to begin.</div>
          ) : (
            <>
              <div className="admin-toolbar">
                <label>
                  Select Parcel
                  <select
                    value={selectedParcelId}
                    onChange={event => setSelectedParcelId(event.target.value)}
                  >
                    {parcels.map(parcel => (
                      <option key={parcel._id} value={parcel._id}>
                        {parcel.trackingId} - {parcel.receiverName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedParcel ? (
                <div className="admin-card">
                  <div className="admin-grid">
                    <div>
                      <span className="label">Receiver</span>
                      <p>{selectedParcel.receiverName}</p>
                    </div>
                    <div>
                      <span className="label">Destination</span>
                      <p>{selectedParcel.destination}</p>
                    </div>
                    <div>
                      <span className="label">Tracking ID</span>
                      <p>{selectedParcel.trackingId}</p>
                    </div>
                    <div>
                      <span className="label">Shipment Type</span>
                      <p>{selectedParcel.shipmentType}</p>
                    </div>
                  </div>

                  <div className="admin-actions">
                    <label>
                      Update Location
                      <input
                        defaultValue={selectedParcel.location}
                        onBlur={event => handleLocationBlur(selectedParcel._id, event.target.value)}
                      />
                    </label>
                    <label>
                      Change Status
                      <select
                        value={selectedParcel.status}
                        onChange={event => handleStatusChange(selectedParcel._id, event.target.value)}
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Operational Monitoring</p>
              <h2>Delivery analytics and service visibility</h2>
            </div>
          </div>

          <div className="analytics-list">
            {monthlyDeliveries.length === 0 ? (
              <div className="empty-state">Delivered shipments will appear here by month.</div>
            ) : (
              monthlyDeliveries.map(([month, count]) => (
                <div key={month} className="analytics-row">
                  <span>{month}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="content-grid lower-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Communication Services Log</p>
              <h2>History of customer notification events</h2>
            </div>
          </div>

          <div className="notification-list">
            {latestNotifications.length === 0 ? (
              <div className="empty-state">Notification history will appear here.</div>
            ) : (
              latestNotifications.map(notification => (
                <div
                  className="notification-item"
                  key={`${notification.trackingId}-${notification.sentAt}-${notification.status}`}
                >
                  <div>
                    <strong>{notification.trackingId}</strong>
                    <p>{notification.message}</p>
                    <small>Receiver: {notification.receiverName}</small>
                  </div>
                  <small>{new Date(notification.sentAt).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Azure Event Flow</p>
              <h2>Target production architecture</h2>
            </div>
          </div>

          <div className="architecture-list">
            <div>
              <span>1</span>
              <p>Parcel scan enters Azure API Management as the secure ingestion gateway.</p>
            </div>
            <div>
              <span>2</span>
              <p>Azure Service Bus buffers events to prevent crashes during peak surges.</p>
            </div>
            <div>
              <span>3</span>
              <p>Azure Functions process events, retrieve secrets from Key Vault, and update state.</p>
            </div>
            <div>
              <span>4</span>
              <p>Cosmos DB, Azure Maps, Communication Services, and Azure Monitor complete the workflow.</p>
            </div>
          </div>

          <div className="diagram-card">
            <code>
              Driver Scan -&gt; API Management -&gt; Service Bus -&gt; Azure Functions -&gt; Cosmos DB /
              Azure Maps / Communication Services -&gt; Azure Monitor
            </code>
          </div>
        </article>
      </section>

      <section className="content-grid lower-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Current State vs Future State</p>
              <h2>Why DPD Ireland must modernize</h2>
            </div>
          </div>

          <div className="architecture-list">
            <div>
              <span>1</span>
              <p>Current state: scheduled polling, fixed servers, single Athlone hub dependency.</p>
            </div>
            <div>
              <span>2</span>
              <p>Future state: event-driven Azure Functions triggered instantly through Service Bus.</p>
            </div>
            <div>
              <span>3</span>
              <p>Current state: hardcoded or manually managed secrets and limited observability.</p>
            </div>
            <div>
              <span>4</span>
              <p>Future state: Key Vault, Application Insights, elasticity, and multi-zone resilience.</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Professor Summary</p>
              <h2>Short explanation of the proposed Azure solution</h2>
            </div>
          </div>

          <div className="diagram-card">
            <code>
              This prototype shows how DPD Ireland can replace notification lag with an Azure
              cloud-native, event-driven model that is scalable, secure, and pay-as-you-go.
            </code>
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
