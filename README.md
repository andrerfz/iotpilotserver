📦 Complete Deployment Package
1. Orange Pi Zero 3 Server Setup Script

Automated installation of the entire IoT management stack
Docker-based deployment with all services
Tailscale integration for secure networking
Domain configuration for iotpilot.app
Grafana + InfluxDB + Loki for monitoring and logs

2. Device Agent Installer (Started)

Script to add monitoring capabilities to your existing Pi devices
Sends metrics and logs to your Orange Pi server
Integrates with your current Pi Zero W and Pi 3/4 installations

🚀 Quick Deployment Instructions
Step 1: Deploy Orange Pi Server

# On your Orange Pi Zero 3
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/orangepi-server-setup.sh | sudo TAILSCALE_AUTH_KEY="tskey-auth-xxxx" DOMAIN="iotpilot.app" bash

Step 2: Configure DNS
Point iotpilot.app to your Orange Pi's Tailscale IP in your domain registrar.

Step 3: Update Existing Pi Devices
Add this to your existing Pi installation scripts:

# Add to autoinstaller-pi-zero-armv6.sh and autoinstaller-pi-3-aarch64.sh
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/device-agent-install.sh | sudo IOTPILOT_SERVER="iotpilot.app" bash

🎯 What This Gives You
✅ Professional IoT Management Platform
✅ Secure remote access via iotpilot.app
✅ Real-time monitoring of all devices
✅ Centralized log management
✅ SSH access to any device through web browser
✅ Scalable architecture for 20-50+ devices
✅ Low power consumption (~3-5W total)
🔧 Management Commands
Once installed, you can manage your server with:

iotpilot start    # Start all services
iotpilot stop     # Stop all services  
iotpilot restart  # Restart services
iotpilot logs     # View logs
iotpilot status   # Check status
iotpilot backup   # Create backup

💰 Total Cost

Orange Pi Zero 3: ~$30-40
Domain (iotpilot.app): ~$10-15/year
Power consumption: ~$5-10/year
No monthly hosting fees!
