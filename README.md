# 🍊 IotPilot - IoT Device Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-Compatible-red.svg)](https://www.raspberrypi.org/)

> **Professional IoT device management platform designed for Orange Pi Zero 3 and Raspberry Pi devices. Monitor, control, and manage your IoT infrastructure from anywhere with secure remote access.**

![IotPilot Dashboard](https://via.placeholder.com/800x400?text=IotPilot+Dashboard+Screenshot)

## 🌟 Features

### 🎛️ **Device Management**
- **Centralized Control** - Manage all IoT devices from a single dashboard
- **SSH Terminal Access** - Browser-based SSH to any device
- **Real-time Monitoring** - Live metrics for CPU, memory, temperature, network
- **Device Discovery** - Automatic detection of new devices on the network
- **Configuration Management** - Remote device configuration and updates

### 📊 **Monitoring & Analytics**
- **Grafana Integration** - Professional monitoring dashboards
- **InfluxDB Metrics** - Time-series data storage and analysis
- **Log Aggregation** - Centralized logging with Loki
- **Alerting System** - Email/Slack notifications for device issues
- **Historical Analytics** - Trends and performance insights

### 🔒 **Security & Networking**
- **Tailscale VPN** - Secure zero-trust networking
- **SSL/TLS Encryption** - End-to-end encrypted communications
- **Multi-factor Authentication** - Secure access controls
- **Network Isolation** - Segmented device networks

### 🚀 **Scalability**
- **Multi-device Support** - Manage 20-50+ devices efficiently
- **Docker Architecture** - Containerized for easy scaling
- **Low Resource Usage** - Optimized for single-board computers
- **Auto-scaling** - Dynamic resource allocation

## 🏗️ **Architecture**

```
Internet (iotpilot.app)
    ↓ (Tailscale Magic DNS)
Orange Pi Zero 3 (Management Server)
├── 🐳 Docker Services:
│   ├── IotPilot App (Next.js + ReUI)
│   ├── Grafana (Monitoring Dashboards)
│   ├── InfluxDB (Metrics Storage)
│   ├── Loki (Log Aggregation)
│   ├── PostgreSQL (Application Database)
│   ├── Redis (Caching & Sessions)
│   └── Traefik (Reverse Proxy)
│
└── 📱 Managed IoT Devices:
    ├── Raspberry Pi Zero W
    ├── Raspberry Pi 3/4
    ├── Orange Pi devices
    └── Custom IoT devices
```

## 🚀 **Quick Start**

### **Server Setup (Orange Pi Zero 3)**

1. **Flash Ubuntu 22.04** to your Orange Pi Zero 3
2. **Run the automated installer:**

```bash
# Basic installation
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/orangepi-server-setup.sh | sudo bash

# With Tailscale for remote access
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/orangepi-server-setup.sh | \
  sudo TAILSCALE_AUTH_KEY="tskey-auth-xxxx" DOMAIN="iotpilot.app" bash
```

3. **Configure DNS** - Point your domain to the Orange Pi's Tailscale IP
4. **Access your dashboard** at `https://iotpilot.app`

### **Device Agent Installation**

Add monitoring to your existing Pi devices:

```bash
# Install on any Raspberry Pi
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/device-agent-install.sh | \
  sudo IOTPILOT_SERVER="iotpilot.app" TAILSCALE_AUTH_KEY="tskey-auth-xxxx" bash
```

## 📦 **Installation Methods**

### **Method 1: Automated Script (Recommended)**
Perfect for new installations on Orange Pi Zero 3:
```bash
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/orangepi-server-setup.sh | sudo bash
```

### **Method 2: Manual Docker Installation**
For advanced users or custom setups:
```bash
git clone https://github.com/andrerfz/iotpilot.git
cd iotpilot
cp .env.example .env
# Edit .env with your configuration
make install
```

### **Method 3: Development Setup**
For developers contributing to the project:
```bash
git clone https://github.com/andrerfz/iotpilot.git
cd iotpilot
make dev-install
make dev
```

## 🔧 **Configuration**

### **Environment Variables**

Key configuration options in `.env`:

```bash
# Domain and SSL
DOMAIN=iotpilot.app
ACME_EMAIL=admin@iotpilot.app

# Tailscale VPN
TAILSCALE_AUTH_KEY=tskey-auth-xxxxxxxxxxxx

# Database
POSTGRES_PASSWORD=secure_password
INFLUXDB_TOKEN=your_influxdb_token

# Security
JWT_SECRET=your_jwt_secret
DEVICE_API_KEY=your_device_api_key
```

### **Tailscale Setup**

1. Create a Tailscale account at [tailscale.com](https://tailscale.com)
2. Generate an auth key in the admin console
3. Use the auth key during installation
4. Configure your domain to use Tailscale DNS

## 🎛️ **Management Commands**

IotPilot includes a comprehensive management system:

```bash
# Service Management
make start          # Start all services
make stop           # Stop all services
make restart        # Restart all services
make status         # Show service status

# Monitoring
make logs           # Show application logs
make logs SERVICE=grafana  # Show specific service logs
make monitor        # Real-time resource monitoring
make health         # Health check all services

# Maintenance
make backup         # Create full backup
make update         # Update and restart
make clean          # Clean unused Docker resources

# Development
make dev            # Start development environment
make test           # Run test suite
make lint           # Code quality checks
```

## 📊 **Supported Devices**

### **Server Platforms**
- ✅ **Orange Pi Zero 3** (Recommended)
- ✅ **Raspberry Pi 4**
- ✅ **Raspberry Pi 3**
- ✅ **Any ARM64/x86_64 Linux system**

### **Managed Device Types**
- ✅ **Raspberry Pi Zero W** (ARMv6)
- ✅ **Raspberry Pi 3/4** (ARM64)
- ✅ **Orange Pi series**
- ✅ **Generic Linux devices**
- 🔄 **Arduino/ESP32** (Planned)
- 🔄 **Custom IoT devices** (Planned)

## 📈 **Performance & Requirements**

### **Orange Pi Zero 3 Server Requirements**
- **CPU**: Allwinner H618 (4-core ARM Cortex-A53)
- **RAM**: 1-4GB (2GB+ recommended)
- **Storage**: 16GB+ microSD card (32GB+ recommended)
- **Network**: Ethernet + WiFi
- **Power**: 5V/2A USB-C

### **Performance Expectations**
- **Concurrent Devices**: 20-50 devices
- **Data Retention**: 6-12 months of metrics
- **Response Time**: <500ms dashboard loads
- **Power Consumption**: ~3-5W total
- **Uptime**: 99%+ with proper setup

## 🔒 **Security**

IotPilot implements enterprise-grade security:

- **🔐 Zero-Trust Networking** - Tailscale VPN for all communications
- **🛡️ SSL/TLS Encryption** - End-to-end encrypted web traffic
- **🔑 JWT Authentication** - Secure API access tokens
- **🚫 Network Isolation** - Segmented device networks
- **📝 Audit Logging** - Comprehensive activity tracking
- **🔄 Auto-updates** - Security patches and updates
- **🏰 Firewall Rules** - Minimal attack surface

## 📚 **API Documentation**

### **Device Management Endpoints**

```bash
# Device Operations
GET    /api/devices              # List all devices
GET    /api/devices/:id          # Get specific device
POST   /api/devices              # Add new device
PUT    /api/devices/:id          # Update device
DELETE /api/devices/:id          # Remove device

# Device Control
GET    /api/devices/:id/status   # Get device status
POST   /api/devices/:id/command  # Send command
GET    /api/devices/:id/logs     # Get device logs
GET    /api/devices/:id/metrics  # Get device metrics

# SSH Access
POST   /api/ssh/connect          # Establish SSH connection
GET    /api/ssh/sessions         # List active sessions
DELETE /api/ssh/sessions/:id     # Close SSH session
```

### **Monitoring Endpoints**

```bash
# System Health
GET    /api/health               # System health check
GET    /api/metrics              # System metrics
GET    /api/status               # Service status

# Device Metrics
POST   /api/devices/heartbeat    # Device status report
GET    /api/devices/:id/metrics  # Historical metrics
GET    /api/alerts               # Active alerts
```

## 🛠️ **Development**

### **Tech Stack**
- **Frontend**: Next.js 14 + ReUI + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL + InfluxDB + Redis
- **Monitoring**: Grafana + Loki + Prometheus
- **Infrastructure**: Docker + Traefik + Tailscale

### **Project Structure**
```
iotpilot/
├── app/                    # Main application
│   ├── components/         # React components
│   ├── pages/             # Next.js pages
│   ├── api/               # API routes
│   ├── lib/               # Utilities
│   └── styles/            # CSS styles
├── scripts/               # Installation scripts
├── grafana/               # Grafana dashboards
├── docker/                # Docker configurations
└── docs/                  # Documentation
```

### **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🗺️ **Roadmap**

### **Version 2.0** (Q2 2024)
- [ ] Mobile app (iOS/Android)
- [ ] Arduino/ESP32 support
- [ ] Advanced automation rules
- [ ] Multi-user management
- [ ] Cloud sync capabilities

### **Version 2.1** (Q3 2024)
- [ ] Machine learning insights
- [ ] Predictive maintenance
- [ ] Custom device drivers
- [ ] Advanced security features
- [ ] Enterprise features

### **Version 3.0** (Q4 2024)
- [ ] Edge computing capabilities
- [ ] Kubernetes support
- [ ] Multi-site management
- [ ] Advanced analytics
- [ ] Professional support

## 💰 **Cost Analysis**

### **Total Ownership Cost**
| Component | One-time Cost | Annual Cost |
|-----------|---------------|-------------|
| Orange Pi Zero 3 | $30-40 | - |
| Domain (iotpilot.app) | - | $10-15 |
| Power consumption | - | $5-10 |
| **Total** | **$30-40** | **$15-25** |

**vs. Cloud alternatives**: $50-200/month

## 🆘 **Support**

### **Documentation**
- 📖 [Installation Guide](docs/installation.md)
- 🔧 [Configuration Reference](docs/configuration.md)
- 🚀 [API Documentation](docs/api.md)
- 🐛 [Troubleshooting](docs/troubleshooting.md)

### **Community**
- 💬 [Discord Community](https://discord.gg/iotpilot)
- 🐛 [Issue Tracker](https://github.com/andrerfz/iotpilot/issues)
- 📧 [Email Support](mailto:support@iotpilot.app)
- 📱 [Twitter Updates](https://twitter.com/iotpilot)

### **Professional Support**
For enterprise deployments and professional support:
- 🏢 [Enterprise Plans](https://iotpilot.app/enterprise)
- 📞 [Professional Services](https://iotpilot.app/services)

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Grafana Labs** - For excellent monitoring tools
- **Tailscale** - For zero-trust networking
- **Orange Pi Foundation** - For affordable single-board computers
- **Docker** - For containerization platform
- **Next.js Team** - For the amazing React framework

---

<div align="center">

**⭐ Star this repo if IotPilot helped you manage your IoT devices! ⭐**

[🚀 Get Started](https://github.com/andrerfz/iotpilot) • [📖 Documentation](docs/) • [💬 Community](https://discord.gg/iotpilot) • [🐛 Report Bug](https://github.com/andrerfz/iotpilot/issues)

Made with ❤️ for the IoT community

</div>