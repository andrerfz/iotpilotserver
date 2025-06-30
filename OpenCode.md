# OpenCode.md - IoT Pilot Server

## 🚀 Project Overview
**Enterprise IoT management platform** with comprehensive device monitoring, remote command execution, and real-time analytics.  
**Architecture**: Migrating from traditional Next.js to Domain-Driven Design (DDD)  
**Current Status**: Phase 5/12 - Device Domain Services & Repositories  
**Target Platform**: Orange Pi Zero 3 with Docker deployment and multi-tenant support

## 📖 Migration Instructions
**Please read `.junie.migrate-to-DDD.step05.md` for detailed Phase 5 instructions and update your understanding of the current migration tasks.**

Additional phase documentation available in:
- `.junie.migrate-to-DDD.step01.md` through `.junie.migrate-to-DDD.step12.md`
- Each file contains specific tasks, code examples, and validation steps

## 📊 Current Migration Status

### **Phase Progress** (5/12)
- ✅ **Phase 1**: Project Setup & Structure (3-5 days)
- ✅ **Phase 2**: Shared Kernel & Infrastructure (4-6 days)
- ✅ **Phase 3**: User Domain Migration (5-7 days)
- ✅ **Phase 4**: Device Domain - Entities & VOs (4-6 days)
- 🔄 **Phase 5**: Device Domain - Services & Repositories (5-7 days) **CURRENT**
- ⏳ **Phase 6**: Device Domain - Use Cases (6-8 days)
- ⏳ **Phase 7**: Monitoring Domain Migration (5-7 days)
- ⏳ **Phases 8-12**: API Routes, Frontend, Testing, CLI, Documentation

### **Current Phase 5 Tasks**
1. **Repository Interfaces**: Define abstract contracts for data access
2. **Prisma Repositories**: Implement database persistence layer
3. **In-Memory Repositories**: Create testing implementations
4. **Domain Services**: Business logic that doesn't belong to entities
5. **Infrastructure Services**: External integrations (SSH, MQTT, WebSocket)
6. **Data Mappers**: Convert between domain and persistence models

## 🏗️ Project Structure

### **Technology Stack**
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Prisma ORM, PostgreSQL, Redis
- **Monitoring**: Grafana, Loki, InfluxDB, Prometheus
- **Communication**: MQTT broker, WebSocket, REST API
- **Deployment**: Docker Compose, Traefik proxy, Tailscale VPN
- **Testing**: Jest, Playwright, Supertest

### **DDD Architecture Implementation**
```
src/lib/
├── shared/                    # ✅ Shared Kernel (Complete)
│   ├── domain/
│   │   ├── entities/          # Base aggregate, entity classes
│   │   ├── value-objects/     # Common VOs (Email, IPAddress, etc.)
│   │   ├── interfaces/        # Repository, service contracts
│   │   ├── exceptions/        # Domain exceptions
│   │   └── events/            # Domain event base classes
│   ├── application/
│   │   ├── bus/               # Command/Query/Event buses
│   │   ├── interfaces/        # Application service contracts  
│   │   └── dto/               # Data transfer objects
│   └── infrastructure/
│       ├── persistence/       # Database configuration
│       ├── config/            # App configuration
│       ├── middleware/        # Express middleware
│       └── utils/             # Utility functions
│
├── user/                      # ✅ User Domain (Complete)
│   ├── domain/
│   │   ├── entities/          # User, Customer, Session
│   │   ├── value-objects/     # UserId, Email, UserRole
│   │   ├── services/          # Authentication, authorization
│   │   └── events/            # UserCreated, UserUpdated
│   ├── application/
│   │   ├── commands/          # CreateUser, UpdateUser, DeleteUser
│   │   ├── queries/           # GetUser, ListUsers, GetUsersByRole
│   │   └── services/          # UserApplicationService
│   └── infrastructure/
│       ├── repositories/      # PrismaUserRepository
│       ├── services/          # JWTService, PasswordHashingService
│       └── dto/               # UserDTO, CreateUserDTO
│
├── device/                    # 🔄 Device Domain (Phase 5 - Current)
│   ├── domain/                # ✅ Complete (Phase 4)
│   │   ├── entities/          # Device, Gateway, Sensor, Actuator
│   │   ├── value-objects/     # DeviceId, DeviceName, IPAddress, DeviceStatus
│   │   ├── services/          # DeviceConfigurationService
│   │   ├── interfaces/        # DeviceRepository, DeviceService contracts
│   │   ├── policies/          # Device validation rules
│   │   ├── events/            # DeviceRegistered, DeviceStatusChanged
│   │   └── exceptions/        # DeviceNotFound, InvalidConfiguration
│   ├── application/           # ⏳ Phase 6 (Upcoming)
│   │   ├── commands/          # RegisterDevice, ConfigureDevice, ExecuteCommand
│   │   ├── queries/           # GetDevice, ListDevices, GetDeviceMetrics
│   │   └── services/          # DeviceApplicationService
│   └── infrastructure/        # 🔄 Current Phase 5 Focus
│       ├── repositories/      # PrismaDeviceRepository, InMemoryDeviceRepository
│       ├── services/          # SSHService, MQTTService, WebSocketService
│       ├── dto/               # DeviceDTO, DeviceMetricsDTO
│       └── mappers/           # DeviceMapper (domain ↔ persistence)
│
└── monitoring/                # ⏳ Phase 7 (Upcoming)
    ├── domain/                # Metric, Alert, Dashboard entities
    ├── application/           # Monitoring use cases
    └── infrastructure/        # InfluxDB integration, Grafana APIs
```

### **Frontend Structure**
```
src/
├── app/                       # Next.js App Router
│   ├── (dashboard)/          # Dashboard layout group
│   ├── api/                  # API routes (will be refactored in Phase 8)
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── ui/                   # Reusable UI components
│   ├── device/               # Device-specific components
│   ├── user/                 # User management components
│   └── monitoring/           # Monitoring dashboard components
├── hooks/                    # React hooks
│   ├── use-command.ts        # DDD command execution
│   ├── use-query.ts          # DDD query execution
│   └── use-device.ts         # Device-specific hooks
└── context/                  # React context providers
    └── ddd.context.tsx       # DDD bus providers
```

## 🛠️ Development Workflow

### **Core Makefile Commands**
```bash
# Environment Setup
make fresh-setup              # Complete fresh installation
make local-install            # Install dependencies only
make local-start              # Start development environment
make local-stop               # Stop all services
make local-clean              # Clean up containers and volumes

# Development
make dev                      # Start Next.js development server
make build                    # Build production application
make lint                     # Run ESLint
make format                   # Format code with Prettier

# Database Management
make db-migrate               # Run Prisma migrations
make db-seed                  # Seed database with test data
make db-reset                 # Reset database (drop + migrate + seed)
make db-studio                # Open Prisma Studio
make db-push                  # Push schema changes (development)

# Testing
make test-unit                # Run unit tests only
make test-integration         # Run integration tests
make test-e2e                 # Run end-to-end tests
make test-all                 # Run complete test suite
make test-coverage            # Generate test coverage report
make test-watch               # Run tests in watch mode

# Docker Operations
make docker-build             # Build Docker images
make docker-dev               # Start development containers
make docker-prod              # Start production containers
make docker-logs              # View container logs
make docker-clean             # Clean up Docker resources

# Deployment
make deploy-staging           # Deploy to staging environment
make deploy-production        # Deploy to production
make backup-create            # Create system backup
make backup-restore           # Restore from backup
```

### **Phase 5 Specific Commands**
```bash
# Repository Testing
make test-device-repos        # Test device repository implementations
make test-domain-services     # Test device domain services
make test-infrastructure      # Test infrastructure services

# Database Development
make db-device-seed           # Seed device test data
make db-migration-create      # Create new migration file
```

## 🧪 Testing Strategy

### **Test Organization**
```
__tests__/
├── unit/                     # Isolated component tests
│   ├── device/
│   │   ├── domain/
│   │   │   ├── entities/     # Device entity tests
│   │   │   ├── value-objects/ # DeviceId, DeviceName tests
│   │   │   └── services/     # Domain service tests
│   │   └── infrastructure/
│   │       ├── repositories/ # Repository implementation tests
│   │       ├── services/     # SSH, MQTT service tests
│   │       └── mappers/      # Data mapper tests
│   ├── user/                 # User domain tests
│   └── shared/               # Shared kernel tests
├── integration/              # Component interaction tests
│   ├── api/                  # API endpoint tests
│   ├── database/             # Database integration tests
│   └── external/             # External service integration tests
├── e2e/                      # End-to-end workflow tests
│   ├── device-management/    # Device lifecycle tests
│   ├── user-authentication/  # Auth flow tests
│   └── monitoring-dashboard/ # Dashboard functionality tests
└── fixtures/                 # Test data and mocks
    ├── devices.json          # Device test data
    ├── users.json            # User test data
    └── metrics.json          # Monitoring test data
```

### **Testing Patterns (Phase 5 Focus)**
```typescript
// Repository Unit Test
describe('PrismaDeviceRepository', () => {
  let repository: PrismaDeviceRepository;
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    repository = new PrismaDeviceRepository(prisma);
  });

  it('should save and retrieve device', async () => {
    const device = Device.create(
      DeviceName.create('Test Device'),
      IPAddress.create('192.168.1.100'),
      DeviceCredentials.create('user', 'pass')
    );

    await repository.save(device);
    const retrieved = await repository.findById(device.getId());

    expect(retrieved?.getName().getValue()).toBe('Test Device');
  });
});

// Domain Service Test
describe('DeviceConfigurationService', () => {
  it('should validate device configuration', () => {
    const service = new DeviceConfigurationService();
    const config = DeviceConfiguration.create({
      networkSettings: { dhcp: true },
      securitySettings: { sshEnabled: true }
    });

    expect(() => service.validateConfiguration(config)).not.toThrow();
  });
});

// Infrastructure Service Test  
describe('SSHService', () => {
  it('should execute remote command', async () => {
    const sshService = new SSHService();
    const connection = SSHConnection.create('192.168.1.100', credentials);
    
    const result = await sshService.executeCommand(connection, 'uptime');
    expect(result.isSuccess()).toBe(true);
  });
});
```

## 🎯 How the Project Works

### **DDD Principles Applied**
1. **Bounded Contexts**: Clear separation between Device, User, and Monitoring domains
2. **Aggregate Roots**: Device, User, Customer as consistency boundaries
3. **Value Objects**: Immutable objects for DeviceId, Email, IPAddress
4. **Domain Services**: Business logic that doesn't belong to specific entities
5. **Repository Pattern**: Abstract data access from domain logic
6. **CQRS**: Command/Query separation for different read/write concerns
7. **Domain Events**: Loose coupling between aggregates via events

### **Current Development Focus (Phase 5)**
1. **Repository Implementation**: Converting data access to repository pattern
2. **Domain Services**: Extracting business logic into domain services
3. **Infrastructure Services**: Implementing external service integrations
4. **Data Mapping**: Converting between domain and persistence models
5. **Testing**: Comprehensive coverage of repository and service layers

### **Business Domains**
- **Device Domain**: Core IoT functionality - device registration, configuration, monitoring, command execution
- **User Domain**: Authentication, authorization, multi-tenant customer management
- **Monitoring Domain**: Real-time metrics, alerts, dashboards, analytics
- **Shared Kernel**: Common value objects, interfaces, and infrastructure

### **Key Integration Points**
- **MQTT Broker**: Device-to-server communication
- **WebSocket**: Real-time UI updates
- **SSH Connections**: Remote device management
- **Time-series DB**: Metrics storage (InfluxDB)
- **Relational DB**: Domain data storage (PostgreSQL)

## 📁 Key Configuration Files

- **Migration Plans**: `.junie.migrate-to-DDD.stepXX.md` (detailed phase instructions)
- **Database Schema**: `prisma/schema.prisma`
- **Environment Config**: `.env.example`, `.env.local`
- **Docker Setup**: `docker-compose.yml`, `docker-compose.local.yml`
- **Build Config**: `next.config.js`, `package.json`
- **Development**: `Makefile`, `tsconfig.json`, `tailwind.config.js`

## 💡 Development Guidelines

### **Phase 5 Implementation Order**
1. **Define Repository Interfaces** in domain layer
2. **Implement Prisma Repositories** with proper error handling
3. **Create In-Memory Repositories** for testing
4. **Build Domain Services** for business logic
5. **Add Infrastructure Services** for external integrations
6. **Write Comprehensive Tests** for all implementations
7. **Create Data Mappers** for domain/persistence conversion

### **Code Quality Standards**
- **TypeScript Strict Mode**: Full type safety
- **Domain-First**: Business logic stays in domain layer
- **Test Coverage**: Minimum 80% for infrastructure, 90%+ for domain
- **Error Handling**: Proper exception types and handling
- **Logging**: Structured logging for debugging and monitoring

---

## 🔄 OpenCode.md Update Instructions

### **When to Update This File**
This OpenCode.md should be updated when significant progress is made:

1. **Phase Completion**: When moving from one phase to another
2. **Major Task Completion**: When completing key tasks within a phase
3. **Architecture Changes**: When DDD structure or patterns evolve
4. **New Features**: When adding new domains, services, or major functionality

### **How to Update**

#### **Phase Progress Updates**
When completing Phase 5 and moving to Phase 6:
```markdown
# Update Current Status Section
- ✅ **Phase 5**: Device Domain - Services & Repositories (COMPLETE)
- 🔄 **Phase 6**: Device Domain - Use Cases (6-8 days) **CURRENT**

# Update DDD Structure Progress
├── device/                    # 🔄 Phase 6 - Use Cases & Application Layer
│   ├── domain/               # ✅ Complete (Phase 4)
│   ├── application/          # 🔄 CURRENT - Commands, queries, handlers
│   └── infrastructure/       # ✅ Complete (Phase 5)
```

#### **Task Completion Updates**
When completing specific Phase 5 tasks:
```markdown
### **Current Phase 5 Tasks**
1. ✅ **Repository Interfaces**: Define abstract contracts for data access
2. ✅ **Prisma Repositories**: Implement database persistence layer
3. ✅ **In-Memory Repositories**: Create testing implementations  
4. 🔄 **Domain Services**: Business logic that doesn't belong to entities
5. ⏳ **Infrastructure Services**: External integrations (SSH, MQTT, WebSocket)
6. ⏳ **Data Mappers**: Convert between domain and persistence models
```

#### **New Commands/Features**
When adding new Makefile targets or development tools:
```bash
# Add to Makefile Commands section
make test-device-commands     # Test device command handlers (Phase 6)
make generate-device-usecase  # Generate new device use case (Phase 6)
```

#### **Testing Updates**
When expanding test coverage or adding new test types:
```typescript
// Add new testing patterns for current phase
// Command Handler Test (Phase 6)
describe('RegisterDeviceHandler', () => {
  it('should register device and publish events', async () => {
    const command = new RegisterDeviceCommand('Device1', '192.168.1.100');
    await handler.handle(command);
    
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
```

### **Update Triggers**

#### **Automatic Updates** (when these happen)
- Completing a full phase → Update phase progress
- Adding new domain → Update DDD structure
- Adding new Makefile commands → Update command reference
- Major architectural decisions → Update "How the Project Works"

#### **Manual Reviews** (schedule these)
- **Weekly**: Review current phase tasks and mark completed items
- **Phase Transitions**: Comprehensive update of status and focus areas
- **Monthly**: Review and update technology stack, dependencies
- **Major Milestones**: Update project overview and business context

### **Update Template**

When updating, use this checklist:

#### **Phase Transition Update**
- [ ] Update migration status section (completed/current/upcoming phases)
- [ ] Update DDD structure progress indicators
- [ ] Update current phase tasks list
- [ ] Update development focus areas
- [ ] Update testing strategy for new phase
- [ ] Read and reference new `.junie.migrate-to-DDD.stepXX.md` file

#### **Task Completion Update**
- [ ] Mark completed tasks with ✅
- [ ] Update current tasks with 🔄
- [ ] Add new tasks discovered during development
- [ ] Update any new Makefile commands
- [ ] Update testing patterns if new test types added

#### **Architecture Evolution Update**
- [ ] Update DDD structure if new layers/components added
- [ ] Update technology stack if dependencies change
- [ ] Update key files section if important files added/moved
- [ ] Update development guidelines if patterns change

### **Version Tracking**
Consider adding version/date tracking to major updates:
```markdown
## 📝 Last Updated
- **Date**: 2024-XX-XX
- **Phase**: 5 → 6 transition
- **Changes**: Completed repository layer, starting use cases
- **Next Review**: When Phase 6 completes
```

---

**🔍 Remember: Keep this file as a living document that accurately reflects the current state of the project and serves as an effective context for development work.**