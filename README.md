# DPD Ireland Azure Customer Notification Modernization

This project is a prototype for DPD Ireland's future Azure-based customer notification platform. It demonstrates how a legacy on-premise, batch-driven notification service can be modernized into a cloud-native, event-driven architecture for near real-time parcel updates.

## Problem Statement

DPD Ireland faces three connected business and operational challenges:

- Notification lag caused by 30 to 60 minute polling cycles
- Poor real-time visibility for customers and operations teams
- Fixed-capacity infrastructure that struggles during peak periods such as Black Friday and Christmas
- A single point of failure in the Athlone hub
- Weak secret handling compared with modern cloud security practice

These issues can increase support requests, reduce customer satisfaction, and limit operational responsiveness.

## Solution

The proposed solution is an Azure cloud-native, event-driven customer notification platform.

- Parcel scan events enter through Azure API Management
- Azure Service Bus buffers events to absorb peak demand
- Azure Functions process events in near real time
- Azure Cosmos DB stores parcel state and history
- Azure Communication Services sends notifications
- Azure Key Vault secures secrets and credentials
- Azure Monitor and Application Insights provide operational visibility

## Features

- Prototype parcel event intake
- Customer parcel tracking by tracking ID
- Event history and notification log
- Operations status update controls
- Dashboard analytics and service monitoring view
- Azure architecture explanation built into the demo

## Tech Stack

- Demo frontend: React
- Demo backend: Node.js and Express
- Prototype data layer: MongoDB Atlas
- Target production architecture: Azure API Management, Service Bus, Azure Functions, Cosmos DB, Azure Key Vault, Azure Communication Services, Azure Monitor

## Architecture

Architecture details are available in [CLOUD_ARCHITECTURE.md](/Users/ajinkyayashwantsonawane/Documents/New%20project/Cloud-Management-Group-project-main/CLOUD_ARCHITECTURE.md).

High-level flow:

```text
Driver Scan -> Azure API Management -> Azure Service Bus -> Azure Functions
-> Azure Cosmos DB / Azure Maps / Azure Communication Services -> Azure Monitor
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

- Event-driven processing removes notification lag
- Elastic scaling handles busy seasonal periods
- High availability reduces dependence on a single local hub
- Managed secrets improve security posture
- Pay-as-you-go cloud services reduce operational overhead
- Monitoring and telemetry improve support and troubleshooting

## Notes

- The current repository contains a working prototype used to demonstrate the target Azure architecture.
- MongoDB Atlas is used as a prototype persistence layer, while Cosmos DB is the recommended production target in the assignment design.
- The frontend production build was verified locally with `npm run build`.
