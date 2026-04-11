# Cloud Architecture

## 1. Architecture Components

- Frontend: React
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Hosting: AWS or Azure

## 2. Request Flow

```text
User -> Frontend -> API -> Database
```

Detailed parcel-notification flow:

```text
Receiver/Admin -> React Frontend -> Express API -> MongoDB Atlas
                                     |
                                     -> Notification Service
```

## 3. Suggested Cloud Services

- EC2 or Azure Virtual Machine: host the backend API
- S3 or Azure Blob Storage: store static assets, logs, exported files, or report attachments
- MongoDB Atlas: managed cloud database for parcels, tracking history, and notification logs

Optional extensions:

- AWS Lambda or Azure Functions for event-driven notification processing
- API Gateway or Azure API Management for scalable API handling

## 4. Scalability

This architecture supports high parcel volume because cloud infrastructure can scale more effectively than a fixed-capacity on-premise system.

- Frontend can be hosted independently and scaled based on traffic
- Backend can be deployed to cloud compute instances or containers
- Database can be managed with cloud scaling, backup, and redundancy
- Notification processing can be extended with event-driven services during peak loads

## 5. Business Alignment

The cloud design directly addresses the DPD Ireland case study:

- reduces notification delay
- improves tracking visibility
- supports peak seasonal parcel volume
- improves service continuity and responsiveness
