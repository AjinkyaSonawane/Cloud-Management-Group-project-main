# Governance

## 1. Access Control

- Admin: can update parcel status and location
- User: can search and track parcel progress using a tracking ID

This supports role separation between operational staff and end users.

## 2. Security

- JWT authentication can be used to protect admin endpoints
- Password hashing can be used for admin account credentials
- API validation and controlled responses reduce malformed data risk

## 3. GDPR Compliance

The system should protect receiver data such as names and email addresses.

Recommended controls:

- collect only necessary personal data
- restrict admin access to operational users
- secure stored data and credentials
- define retention and deletion practices for personal information

## 4. Backup and Resilience

- Daily database backup should be configured
- Cloud redundancy should be used to reduce single points of failure
- Managed cloud services improve disaster recovery options

## 5. Operational Governance

- track changes in GitHub for accountability
- use CI/CD to standardize deployment
- monitor system health and delivery events
- review notification failures during peak operations
