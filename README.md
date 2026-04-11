# Cloud-Based Parcel Tracking System (DPD Ireland Case Study)

This project upgrades a DPD Ireland parcel workflow into a cloud-based parcel tracking and notification system for the MBA Cloud Application Management module. It focuses on business value as well as technical design, especially around real-time tracking, scalability, and cloud deployment.

## Problem

DPD Ireland faces three connected business and operational challenges:

- Notification delays caused by legacy batch-style processing
- Poor real-time tracking visibility for receivers and operations staff
- Scalability pressure during peak parcel volumes such as Black Friday and Christmas

These issues can increase support requests, reduce customer satisfaction, and limit operational responsiveness.

## Solution

The proposed solution is a cloud-based parcel tracking system with a real-time notification model.

- Parcel events are captured and stored through a Node.js and Express API
- Status changes automatically update parcel history and notification logs
- Users can track a parcel using a tracking ID
- Admin users can update parcel status and location
- Dashboard analytics provide business visibility into delivery performance

## Features

- Parcel creation for new shipments
- Parcel tracking by tracking ID
- Status history for each parcel
- Notification log for every status update
- Admin status and location updates
- Dashboard analytics for:
  - total parcels
  - delivered parcels
  - in-transit parcels
  - delayed parcels
  - monthly deliveries

## Tech Stack

- Frontend: React
- Backend: Node.js and Express
- Database: MongoDB / MongoDB Atlas

## Architecture

Architecture details are available in [CLOUD_ARCHITECTURE.md](/Users/ajinkyayashwantsonawane/Documents/New%20project/Cloud-Management-Group-project-main/CLOUD_ARCHITECTURE.md).

High-level flow:

```text
User -> Frontend -> API -> Database -> Notification Service
```

## Governance

Governance and control considerations are documented in [GOVERNANCE.md](/Users/ajinkyayashwantsonawane/Documents/New%20project/Cloud-Management-Group-project-main/GOVERNANCE.md).

## CI/CD Pipeline

Recommended pipeline for deployment:

- Developers push code to GitHub
- GitHub Actions or Azure DevOps runs automated build checks
- Frontend and backend are deployed to cloud infrastructure
- Updated application is released to the target environment

Recommended tools:

- GitHub Actions
- Azure DevOps

## Setup Instructions

### Backend

1. Open the `backend` folder
2. Install dependencies with `npm install`
3. Create a `.env` file using `.env.example`
4. Start the backend with `npm run dev`

Example backend environment:

```env
PORT=5000
MONGO_URI=your_connection
JWT_SECRET=your_secret
```

### Frontend

1. Open the `frontend` folder
2. Install dependencies with `npm install`
3. Create a `.env` file using `.env.example`
4. Start the frontend with `npm run dev`

Example frontend environment:

```env
VITE_API_URL=
```

Leave `VITE_API_URL` empty for local development with the Vite proxy, or set it only when the API is hosted on a different origin.

## Deployment

This repository is configured for a single-service deployment on Render so the React dashboard and Express API are served from the same public URL.

### Render deployment steps

1. Push this repository to GitHub.
2. In Render, create a new Blueprint deployment from the repository.
3. Render will detect [render.yaml](/Users/ajinkyayashwantsonawane/Documents/New%20project/Cloud-Management-Group-project-main/render.yaml).
4. Set the required secret environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
5. Deploy the service.

After deployment, your dashboard link will be the service root URL, for example:

```text
https://dpd-parcel-tracking-dashboard.onrender.com/
```

The API will be available on the same host:

```text
https://dpd-parcel-tracking-dashboard.onrender.com/api/health
```

### Why this deployment shape works

- one public URL for both the dashboard and API
- no cross-origin issues between frontend and backend
- simpler demo flow for the assignment presentation
- easier operations story for cloud hosting and scaling

## Cloud Benefits

- Scalability: the system can handle growing parcel volume more effectively than an on-premise batch process
- Real-time processing: status changes can trigger immediate notifications and visibility updates
- High availability: cloud deployment reduces single points of failure and supports better resilience

## Notes

- The current repository contains the working application structure and supporting documentation for the assignment.
- The frontend production build was verified locally with `npm run build`.
