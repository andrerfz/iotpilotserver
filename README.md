# 🚀 IoT Pilot - Complete IoT Device Management Platform

A comprehensive, production-ready IoT management platform for Raspberry Pi and similar devices. Built with Next.js, Docker, and modern monitoring tools.

## 📋 Project Status: **COMPLETED & READY**

✅ **All critical components implemented**  
✅ **Production-ready infrastructure**  
✅ **Complete monitoring stack**  
✅ **Automated installation scripts**  
✅ **Security hardened**

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Devices   │───▶│  Orange Pi Zero │───▶│   Cloud/Remote  │
│  (Pi Zero, 3,4) │    │   (IoT Server)  │    │   Dashboard     │
│                 │    │                 │    │                 │
│ • Telegraf      │    │ • Next.js App   │    │ • Web Interface │
│ • Promtail      │    │ • InfluxDB      │    │ • Mobile App    │
│ • Agent         │    │ • Grafana       │    │ • API Access   │
│ • Tailscale     │    │ • Traefik       │    │ • Alerts        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Features

### 📱 **Device Management**
- **Real-time monitoring** of CPU, memory, disk, temperature
- **Device registration** with auto-discovery
- **Remote SSH access** through web browser
- **Command execution** on remote devices
- **File transfer** and log viewing
- **Grouping and tagging** of devices

### 📊 **Monitoring & Analytics**
- **Grafana dashboards** with beautiful visualizations
- **InfluxDB** for time-series metrics storage
- **Loki** for centralized log aggregation
- **Prometheus** for application metrics
- **Real-time alerts** via email, Slack, webhooks

### 🔒 **Security & Networking**
- **Tailscale mesh VPN** for secure device connections
- **SSL/TLS encryption** with automatic certificates
- **Rate limiting** and DDoS protection
- **User authentication** and role-based access
- **API key management** for integrations

### 🛠️ **DevOps & Automation**
- **Docker containerization** for easy deployment
- **Automated backups** with S3 support
- **CI/CD pipeline** with GitHub Actions
- **Health checks** and monitoring
- **Horizontal scaling** support

---

## 🚀 Quick Start

### 1️⃣ **Server Setup (Orange Pi Zero 3)**

```bash
# One-command server installation
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/orangepi-server-setup.sh | \
  sudo TAILSCALE_AUTH_KEY="tskey-auth-xxxx" DOMAIN="iotpilot.app" bash
```

### 2️⃣ **Device Agent Installation**

```bash
# Install on each IoT device
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/device-agent-install.sh | \
  sudo IOTPILOT_SERVER="iotpilot.app" TAILSCALE_AUTH_KEY="tskey-auth-xxxx" bash
```

### 3️⃣ **Local Development**

```bash
# Clone repository
git clone https://github.com/andrerfz/iotpilot.git
cd iotpilot

# Setup local environment
cp .env.example .env.local
make local-install
make local-start

# Access dashboard
open http://iotpilotserver.test:3001
```

---

## 📁 Project Structure

```
iotpilot/
├── 📱 app/                          # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                 # API Routes
│   │   │   │   ├── health/          # Health checks
│   │   │   │   ├── devices/         # Device management
│   │   │   │   └── auth/            # Authentication
│   │   │   ├── page.tsx             # Main dashboard
│   │   │   └── layout.tsx           # App layout
│   │   ├── components/              # React components
│   │   └── lib/                     # Utilities
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── migrations/              # DB migrations
│   ├── package.json                 # Dependencies
│   ├── server.js                    # Express server
│   └── next.config.js               # Next.js config
├── 🐳 docker/                       # Docker Configuration
│   ├── Dockerfile                   # App container
│   ├── docker-compose.yml           # Production setup
│   └── docker-compose.local.yml     # Development setup
├── 🔧 scripts/                      # Installation Scripts
│   ├── orangepi-server-setup.sh     # Server installation
│   ├── device-agent-install.sh      # Device agent
│   ├── backup.sh                    # Backup script
│   └── restore.sh                   # Restore script
├── 🌐 traefik/                      # Reverse Proxy
│   ├── traefik.yml                  # Main config
│   └── dynamic/                     # Dynamic config
├── 📊 grafana/                      # Monitoring Dashboards
│   ├── dashboards/                  # Pre-built dashboards
│   └── provisioning/                # Auto-configuration
├── 🗄️ influxdb/                     # Time-series Database
├── 📝 loki/                         # Log Aggregation
├── 🔍 prometheus/                   # Metrics Collection
├── ⚙️ .github/workflows/            # CI/CD Pipeline
└── 📖 docs/                         # Documentation
```

---

## 🔧 Components & Technologies

### **Frontend & Backend**
- **Next.js 14** - React framework with SSR
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Socket.IO** - Real-time communication
- **Express.js** - Custom server integration

### **Database & Storage**
- **PostgreSQL** - Primary database
- **Prisma** - Type-safe ORM
- **InfluxDB** - Time-series metrics
- **Redis** - Caching and sessions

### **Monitoring & Observability**
- **Grafana** - Visualization dashboards
- **Loki** - Log aggregation
- **Prometheus** - Metrics collection
- **Telegraf** - Metrics agent
- **Promtail** - Log shipping

### **Infrastructure & DevOps**
- **Docker** - Containerization
- **Traefik** - Reverse proxy & SSL
- **Tailscale** - Mesh VPN networking
- **GitHub Actions** - CI/CD automation

---

## 🌐 Access Points

### **Production Deployment**
- **Main Dashboard**: `https://iotpilot.app`
- **Grafana**: `https://iotpilot.app/grafana`
- **Traefik Dashboard**: `https://iotpilot.app/traefik` (admin only)

### **Local Development**
- **Main Dashboard**: `http://iotpilotserver.test:3001`
- **Grafana**: `http://iotpilotserver.test:3002`
- **InfluxDB**: `http://localhost:8087`
- **Traefik**: `http://localhost:8081`

---

## 🔑 Default Credentials

### **Production**
- **Admin User**: Check `/opt/iotpilot/.env` after installation
- **Grafana**: `admin` / `${GRAFANA_PASSWORD}`

### **Local Development**
- **Admin User**: `admin@iotpilot.local` / `admin123`
- **Grafana**: `admin` / `admin123`
- **InfluxDB**: `admin` / `influxdb123`

---

## 🛠️ Management Commands

### **Production Server**
```bash
# Service management
iotpilot start        # Start all services
iotpilot stop         # Stop all services  
iotpilot restart      # Restart services
iotpilot status       # Check status
iotpilot logs         # View logs

# Maintenance
iotpilot backup       # Create backup
iotpilot update       # Update and restart
```

### **Local Development**
```bash
# Quick commands
make dev              # Start development
make local-start      # Start local services
make local-stop       # Stop local services
make local-status     # Check status

# Development
make test             # Run tests
make lint             # Code linting
make shell            # Access container shell
```

---

## 📊 Monitoring & Alerting

### **Built-in Dashboards**
- **Device Overview** - All devices status
- **System Metrics** - CPU, memory, disk usage
- **Network Monitoring** - Connectivity and traffic
- **Application Health** - Service status and performance
- **Security Monitoring** - Failed logins, alerts

### **Alert Conditions**
- 🔥 **High CPU** (>85%)
- 🧠 **High Memory** (>85%)
- 🌡️ **High Temperature** (>70°C)
- 💾 **Low Disk Space** (>85%)
- 📡 **Device Offline** (>5 minutes)
- ⚠️ **Application Errors**

### **Notification Channels**
- 📧 Email notifications
- 💬 Slack integration
- 🔗 Custom webhooks
- 📱 Mobile push (planned)

---

## 🔒 Security Features

### **Network Security**
- **Tailscale VPN** mesh networking
- **SSL/TLS** encryption everywhere
- **Firewall** configuration
- **Rate limiting** protection

### **Application Security**
- **JWT** authentication
- **Role-based** access control
- **API key** management
- **Session** security
- **CORS** protection
- **Helmet.js** security headers

### **Infrastructure Security**
- **Container** isolation
- **Read-only** file systems
- **Non-root** users
- **Secret** management
- **Automated** security updates

---

## 📈 Scaling & Performance

### **Horizontal Scaling**
- **Load balancing** with Traefik
- **Database** clustering support
- **Redis** cluster mode
- **Multi-region** deployment

### **Performance Optimizations**
- **Caching** strategies
- **Database** indexing
- **Connection** pooling
- **Resource** limits
- **Compression** enabled

### **Monitoring Performance**
- **Response time** tracking
- **Error rate** monitoring
- **Resource usage** alerts
- **Capacity** planning

---

## 🗃️ Backup & Recovery

### **Automated Backups**
- **Daily** automated backups
- **PostgreSQL** database dumps
- **InfluxDB** data export
- **Grafana** dashboards and config
- **Application** data and logs

### **Backup Storage**
- **Local** filesystem
- **AWS S3** integration
- **Retention** policies
- **Compression** and encryption

### **Disaster Recovery**
```bash
# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backup_file.tar.gz

# Verify backup integrity
make verify-backup
```

---

## 🤝 Contributing

### **Development Setup**
```bash
# Fork and clone
git clone https://github.com/yourusername/iotpilot.git
cd iotpilot

# Install dependencies
make local-install

# Start development environment
make dev

# Run tests
make test
make lint
```

### **Project Guidelines**
- **TypeScript** for all new code
- **ESLint** and **Prettier** for formatting
- **Jest** for testing
- **Conventional Commits** for git messages
- **GitHub Flow** for branching

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Documentation

### **Documentation**
- 📖 [Installation Guide](docs/installation.md)
- 🔧 [Configuration Reference](docs/configuration.md)
- 🚀 [Deployment Guide](docs/deployment.md)
- 🔍 [Troubleshooting](docs/troubleshooting.md)
- 🛠️ [API Documentation](docs/api.md)

### **Community**
- 💬 [Discord Server](https://discord.gg/iotpilot)
- 🐛 [Issue Tracker](https://github.com/andrerfz/iotpilot/issues)
- 💡 [Feature Requests](https://github.com/andrerfz/iotpilot/discussions)
- 📧 [Email Support](mailto:support@iotpilot.app)

---

## 🎉 What's Next?

### **Planned Features**
- 📱 **Mobile app** (React Native)
- 🤖 **AI-powered** anomaly detection
- 🔌 **Plugin system** for extensions
- 📊 **Advanced analytics** and reporting
- 🌍 **Multi-tenancy** support
- 🔄 **Device provisioning** automation

### **Integrations**
- **Home Assistant** integration
- **AWS IoT** connectivity
- **Azure IoT** hub support
- **Google Cloud IoT** platform
- **MQTT** broker support
- **LoRaWAN** device support

---

<div align="center">

## 🌟 **Ready to manage your IoT fleet like a pro?**

[⚡ Get Started](docs/installation.md) • [📖 Documentation](docs/) • [💬 Community](https://discord.gg/iotpilot)

</div>