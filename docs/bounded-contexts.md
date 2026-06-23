# Bounded Contexts Documentation

## Overview

IoT Pilot Server is organized into several bounded contexts that represent distinct business domains. Each bounded context has its own domain model, ubiquitous language, and clear boundaries. This document details each bounded context, their responsibilities, and relationships.

## Core Bounded Contexts

### 1. Device Management Context

**Primary Responsibility**: Managing the complete lifecycle of IoT devices in the system.

#### Business Capabilities
- Device registration and onboarding
- Device configuration management
- SSH connection establishment and management
- Remote command execution on devices
- Device status monitoring and health checks
- Device decommissioning and removal

#### Domain Entities
- **Device**: Core aggregate representing an IoT device
- **SshSession**: Manages SSH connections to devices
- **DeviceCommand**: Represents commands executed on devices

#### Value Objects
- **DeviceId**: Unique identifier for devices
- **DeviceName**: Human-readable device hostname
- **IpAddress**: Device network address
- **SshCredentials**: Authentication credentials for SSH
- **DeviceType**: Categorization (Raspberry Pi, Orange Pi, etc.)
- **DeviceStatus**: Current operational state

#### Domain Services
- **DeviceRegistrationService**: Handles device onboarding logic
- **SshConnectionService**: Manages SSH connectivity
- **DeviceConnectivityPolicy**: Validates device accessibility

#### Domain Events
- `DeviceRegisteredEvent`
- `DeviceConnectedEvent`
- `DeviceDisconnectedEvent`
- `DeviceCommandExecutedEvent`

#### Ubiquitous Language
- **Device**: A physical IoT device managed by the platform
- **Registration**: The process of adding a device to the platform
- **Provisioning**: Setting up device configuration and credentials
- **Commissioning**: Making a device operational in the system
- **Decommissioning**: Removing a device from active management

#### Integration Points
- **User Context**: Devices are registered by users
- **Customer Context**: Devices belong to specific customers
- **Monitoring Context**: Device health and metrics
- **Infrastructure**: SSH connectivity and command execution

**Design docs:** [`docs/domain/bc-device/`](domain/bc-device/)

---

### 2. User Management Context

**Primary Responsibility**: Managing user identities, authentication, and authorization within the multi-tenant platform.

#### Business Capabilities
- User registration and profile management
- Authentication and session management
- Role-based access control (RBAC)
- Password policies and security
- Multi-tenant user isolation
- User activity tracking and audit

#### Domain Entities
- **User**: Core aggregate representing a platform user
- **Session**: Manages user authentication sessions

#### Value Objects
- **UserId**: Unique user identifier
- **Email**: User's email address
- **Username**: Unique username for login
- **Password**: Hashed password (never stored in plain text)
- **UserRole**: Authorization level (SUPERADMIN, ADMIN, USER, READONLY)
- **UserStatus**: Account state (ACTIVE, INACTIVE, SUSPENDED)

#### Domain Services
- **AuthenticationService**: Handles login/logout logic
- **AuthorizationService**: Manages permissions and access control
- **PasswordPolicyService**: Enforces password security requirements

#### Domain Events
- `UserRegisteredEvent`
- `UserAuthenticatedEvent`
- `PasswordChangedEvent`
- `UserDeactivatedEvent`

#### Ubiquitous Language
- **Principal**: An authenticated user or system
- **Tenant**: A customer organization (synonym for customer)
- **Role**: A set of permissions granted to users
- **Session**: A period of authenticated access
- **Authentication**: Verifying user identity
- **Authorization**: Determining user permissions

#### Integration Points
- **Customer Context**: Users belong to customers (except SUPERADMIN)
- **Device Context**: Users execute commands on devices
- **All Contexts**: User identity and permissions apply everywhere

**Design docs:** [`docs/domain/bc-user/`](domain/bc-user/)

---

### 3. Customer Management Context

**Primary Responsibility**: Managing multi-tenant customer organizations and their subscriptions.

#### Business Capabilities
- Customer organization management
- Subscription and billing management
- Resource quota enforcement
- Customer-specific configuration
- Multi-tenant data isolation
- Customer lifecycle management

#### Domain Entities
- **Customer**: Core aggregate representing a customer organization

#### Value Objects
- **CustomerId**: Unique customer identifier
- **CustomerName**: Organization name
- **CustomerSlug**: URL-friendly identifier
- **OrganizationSettings**: Customer-specific configuration
- **CustomerStatus**: Account state
- **SubscriptionTier**: Service level (STARTER, PROFESSIONAL, ENTERPRISE)

#### Domain Services
- **CustomerOnboardingService**: Handles new customer setup
- **SubscriptionService**: Manages billing and feature access
- **QuotaEnforcementService**: Validates resource usage against limits

#### Domain Events
- `CustomerCreatedEvent`
- `SubscriptionChangedEvent`
- `CustomerSuspendedEvent`

#### Ubiquitous Language
- **Customer**: An organization using the platform
- **Tenant**: Synonym for customer (technical term)
- **Organization**: Alternative term for customer
- **Subscription**: Service level agreement and billing tier
- **Quota**: Resource usage limits
- **Isolation**: Data separation between customers

#### Integration Points
- **All Contexts**: Provides tenant boundaries and isolation
- **User Context**: Users belong to customers
- **Device Context**: Devices belong to customers
- **Billing Systems**: External integration for payments

**Design docs:** [`docs/domain/bc-customer/`](domain/bc-customer/)

---

### 4. Monitoring Context

**Primary Responsibility**: Collecting, analyzing, and alerting on device metrics and system health.

#### Business Capabilities
- Real-time metrics collection from devices
- Configurable alert thresholds and rules
- Alert generation and management
- Historical data analysis and reporting
- Performance monitoring and anomaly detection
- Alert notification delivery

#### Domain Entities
- **Metric**: Individual measurement data point
- **Alert**: Notification of threshold breaches
- **Threshold**: Alert trigger configuration
- **MonitoringReport**: Aggregated monitoring data

#### Value Objects
- **MetricId**: Unique metric identifier
- **AlertId**: Unique alert identifier
- **ThresholdId**: Unique threshold configuration
- **MetricValue**: Numerical measurement with unit
- **AlertSeverity**: Criticality level (INFO, WARNING, CRITICAL)
- **AlertStatus**: Alert lifecycle state
- **TimeRange**: Date range for queries and reports

#### Domain Services
- **AlertingService**: Evaluates thresholds and creates alerts
- **MetricsCollectionService**: Gathers data from devices
- **ReportGenerationService**: Creates monitoring reports

#### Domain Events
- `AlertTriggeredEvent`
- `AlertAcknowledgedEvent`
- `AlertResolvedEvent`
- `MetricCollectedEvent`
- `ThresholdBreachedEvent`

#### Ubiquitous Language
- **Metric**: A quantitative measurement of device state
- **Alert**: Notification of an abnormal condition
- **Threshold**: Boundary value that triggers alerts
- **Severity**: Importance level of an alert
- **Breach**: When a metric crosses a threshold
- **Anomaly**: Unusual or unexpected behavior

#### Integration Points
- **Device Context**: Sources metrics from devices
- **Customer Context**: Customer-specific thresholds
- **Notification Context**: Delivers alert notifications
- **Analytics Context**: Provides data for reports

**Design docs:** [`docs/domain/bc-monitoring/`](domain/bc-monitoring/)

---

## Supporting Bounded Contexts

### 5. Analytics Context

**Primary Responsibility**: Data analysis, reporting, and business intelligence.

#### Business Capabilities
- Historical data aggregation and analysis
- Custom report generation
- Dashboard creation and management
- Data export and integration
- Trend analysis and forecasting
- Performance analytics

#### Key Components
- **Report**: Generated analysis document
- **Dashboard**: Visual data representation
- **DataExport**: Bulk data extraction
- **AnalyticsEngine**: Data processing and computation

#### Integration Points
- **Monitoring Context**: Sources metrics and alerts
- **Device Context**: Device usage analytics
- **Customer Context**: Customer usage reports
- **External Systems**: Data warehouse integration

---

### 6. Notification Context _(✅ implemented)_

**Primary Responsibility**: Delivering alerts and system notifications across multiple channels. Owns the full delivery lifecycle — dispatch, retry, status tracking — and per-user channel preferences. Implemented under `packages/core/src/notification/`.

**Design docs:** [`docs/domain/bc-notification/`](domain/bc-notification/)

#### Aggregates
- **NotificationRecord** _(primary)_ — one record per (notification, channel, recipient); tracks PENDING → SENDING → DELIVERED / FAILED / DEAD lifecycle
- **NotificationPreference** _(secondary)_ — per-user opt-in/opt-out per (channel, NotificationType)

#### Business Capabilities
- Multi-channel notification dispatch: EMAIL, SLACK, SMS, WEBHOOK, PUSH (iOS/Android via Pusher)
- Delivery status tracking and automatic retry with configurable max attempts
- Per-user notification preferences (channel + type → enabled/disabled + custom destination)
- Audit trail of all notification attempts and outcomes
- Fan-out from domain events: subscribes to `AlertTriggeredEvent`, `AlertResolvedEvent`, `DeviceDisconnectedEvent`, `DeviceConnectedEvent`, `UserAuthenticatedEvent` (login alerts)

#### Value Objects
- `NotificationRecordId` — UUID
- `NotificationPreferenceId` — UUID
- `NotificationDeliveryStatus` — PENDING | SENDING | DELIVERED | FAILED | DEAD | CANCELLED
- `NotificationRecipient` — email / E.164 phone / HTTPS URL / Pusher token (≤ 500 chars, validated per channel)
- `NotificationSubject` — ≤ 200 chars
- `NotificationBody` — ≤ 10 000 chars
- `NotificationAttemptCount` — integer ≥ 0
- `NotificationMaxAttempts` — integer 1–10
- `NotificationError` — nullable string ≤ 2 000 chars
- `SourceEventId` / `SourceEntityId` — UUID strings correlating to the triggering event
- Shared: `NotificationChannel`, `NotificationType` (from `shared/domain/value-objects/`)

#### Integration Points
- **Monitoring Context**: consumes `AlertTriggeredEvent`, `AlertResolvedEvent`. The alert-triggered notification handler now lives here (`notification/application/event-handlers/on-alert-triggered.handler.ts`); monitoring no longer dispatches Slack jobs directly.
- **Device Context**: consumes `DeviceConnectedEvent`, `DeviceDisconnectedEvent`
- **User Context**: consumes `UserAuthenticatedEvent` for login alerts; reads user email to resolve `destination` when `NotificationPreference.destination` is null
- **External Services**: SMTP provider (email), Twilio (SMS), Slack webhooks, Pusher (push)

#### Status
All six commands, three queries, and six event handlers are implemented; HTTP routes live in `apps/backend/src/routes/notifications.router.ts` and `users.router.ts`. Resolved design questions: **Q1** (PUSH channel — `push-channel-dispatcher.ts` shipped) and **Q3** (alert-triggered handler migrated out of monitoring). Only **Q2** (admin-configurable templates, see ADR-008) remains as future work and does not block the current dispatch path.

---

## Context Relationships

### Upstream Dependencies

```
Infrastructure Services
    ↗️
Device Context ←→ User Context ←→ Customer Context
    ↘️                    ↘️
Monitoring Context ←→ Analytics Context
    ↘️
Notification Context
```

### Anti-Corruption Layer

The **Shared Kernel** provides common components used across contexts:

- **TenantContext**: Enforces tenant isolation
- **Domain Events**: Cross-context communication
- **Value Objects**: Common domain primitives
- **Base Classes**: Entity, Aggregate, Repository patterns

### Context Mapping Patterns

1. **Shared Kernel**: Common domain concepts shared across contexts
2. **Customer/Supplier**: Customer context defines customer model, others use it
3. **Conformist**: Contexts adapt to upstream context interfaces
4. **Anti-Corruption Layer**: Translation between different context models

### Event Flow

```
Device Context → Monitoring Context → Notification Context
User Context → All Contexts (authentication events)
Customer Context → All Contexts (tenant boundary events)
```

## Context Boundaries

### What Belongs Where

**Device Context**:
- Physical device management
- SSH connectivity
- Command execution
- Device lifecycle

**User Context**:
- Authentication logic
- Session management
- User profiles
- Authorization

**Customer Context**:
- Organization management
- Subscription logic
- Resource quotas
- Tenant isolation

**Monitoring Context**:
- Metrics collection
- Alert generation
- Threshold management
- Health monitoring

### Forbidden Cross-Context Calls

- Device Context should not directly access user authentication
- User Context should not contain device-specific business logic
- Monitoring Context should not handle user notifications directly
- Customer Context should not contain device management logic

## Evolution Strategy

### Context Splitting
As the system grows, contexts can be split into separate services:

1. **Device Service**: Device management microservice
2. **User Service**: Identity and access management
3. **Monitoring Service**: Observability and alerting
4. **Customer Service**: Multi-tenant management

### Communication Patterns
- **Synchronous**: REST APIs, gRPC
- **Asynchronous**: Event-driven messaging
- **Shared Database**: Common database with strict schema separation
- **Database per Service**: Independent databases with data synchronization

## Testing Strategy

### Context-Level Testing
- **Unit Tests**: Individual domain objects
- **Integration Tests**: Repository and service interactions
- **Contract Tests**: Interface compliance between contexts
- **End-to-End Tests**: Complete user journeys

### Cross-Context Testing
- **Shared Kernel Tests**: Common component validation
- **Event Flow Tests**: End-to-end event processing
- **Data Consistency Tests**: Cross-context data integrity
