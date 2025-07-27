#!/usr/bin/env node

/**
 * Pre-register IoT devices for manufacturing
 *
 * This script generates unique Device IDs and pre-registers them
 * in the database with UNCLAIMED status. These devices can then
 * be claimed by customers after purchase.
 *
 * Usage:
 *   node scripts/preregister-devices.js --count 100
 *   node scripts/preregister-devices.js --count 100 --output devices.csv
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const QRCode = require('qrcode'); // npm install qrcode
const path = require('path');

const prisma = new PrismaClient();

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Generate a unique device ID
 * Format: IOT-XXXX-YYYY
 */
function generateDeviceId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'IOT-';

  // First segment (4 chars)
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  id += '-';

  // Second segment (4 chars)
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return id;
}

/**
 * Check if device ID already exists
 */
async function deviceIdExists(deviceId) {
  const device = await prisma.device.findUnique({
    where: { deviceId }
  });
  return !!device;
}

/**
 * Generate QR code for device ID
 */
async function generateQRCode(deviceId, outputDir) {
  const qrData = JSON.stringify({
    type: 'iotpilot_device',
    deviceId,
    claimUrl: `https://app.iotpilot.com/claim?id=${deviceId}`
  });

  const qrPath = path.join(outputDir, `${deviceId}.png`);

  try {
    await QRCode.toFile(qrPath, qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrPath;
  } catch (error) {
    console.error(`${colors.red}Failed to generate QR code for ${deviceId}${colors.reset}`);
    return null;
  }
}

/**
 * Pre-register devices in database
 */
async function preregisterDevices(count, options = {}) {
  console.log(`\n${colors.cyan}${colors.bold}Pre-registering ${count} devices...${colors.reset}\n`);

  const devices = [];
  const csvRows = ['Device ID,QR Code Path,Registration Date'];

  // Create QR codes directory if generating QR codes
  let qrDir = null;
  if (options.generateQR) {
    qrDir = path.join(process.cwd(), 'generated_devices', new Date().toISOString().split('T')[0]);
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
  }

  for (let i = 0; i < count; i++) {
    let deviceId;
    let attempts = 0;

    // Generate unique device ID (retry if collision)
    do {
      deviceId = generateDeviceId();
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique device ID after 10 attempts');
      }
    } while (await deviceIdExists(deviceId));

    // Create device in database
    const device = await prisma.device.create({
      data: {
        deviceId,
        name: `Unclaimed Device ${deviceId}`,
        status: 'UNCLAIMED',
        deviceType: 'temperature-sensor',
        deviceModel: 'ESP8266',
        architecture: 'esp8266',
        metadata: {
          preregistered: true,
          preregisteredAt: new Date().toISOString(),
          batchId: options.batchId || `BATCH-${Date.now()}`,
          qrGenerated: options.generateQR || false
        }
      }
    });

    devices.push(device);

    // Generate QR code if requested
    let qrPath = 'N/A';
    if (options.generateQR && qrDir) {
      const generatedPath = await generateQRCode(deviceId, qrDir);
      qrPath = generatedPath || 'Failed';
    }

    csvRows.push(`${deviceId},${qrPath},${device.createdAt.toISOString()}`);

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === count - 1) {
      process.stdout.write(`\r${colors.green}✓${colors.reset} Registered: ${i + 1}/${count}`);
    }
  }

  console.log('\n');

  // Write CSV file if requested
  if (options.output) {
    const csvPath = path.join(process.cwd(), options.output);
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`${colors.blue}📄 Device list saved to: ${csvPath}${colors.reset}`);
  }

  // Print summary
  console.log(`\n${colors.green}✅ Successfully pre-registered ${devices.length} devices${colors.reset}`);
  console.log(`\n${colors.cyan}Sample Device IDs:${colors.reset}`);
  devices.slice(0, 5).forEach(d => {
    console.log(`  • ${d.deviceId}`);
  });

  if (devices.length > 5) {
    console.log(`  ... and ${devices.length - 5} more`);
  }

  if (options.generateQR) {
    console.log(`\n${colors.blue}📱 QR codes saved to: ${qrDir}${colors.reset}`);
  }

  return devices;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  count: 1,
  output: null,
  generateQR: false,
  batchId: null
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--count' && args[i + 1]) {
    options.count = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === '--qr') {
    options.generateQR = true;
  } else if (args[i] === '--batch' && args[i + 1]) {
    options.batchId = args[i + 1];
    i++;
  } else if (args[i] === '--help') {
    console.log(`
${colors.cyan}Usage:${colors.reset}
  node scripts/preregister-devices.js [options]

${colors.cyan}Options:${colors.reset}
  --count <number>    Number of devices to pre-register (default: 1)
  --output <file>     Save device list to CSV file
  --qr                Generate QR codes for each device
  --batch <id>        Batch ID for tracking (default: auto-generated)
  --help              Show this help message

${colors.cyan}Examples:${colors.reset}
  node scripts/preregister-devices.js --count 100
  node scripts/preregister-devices.js --count 100 --output devices.csv --qr
  node scripts/preregister-devices.js --count 50 --batch PROD-2025-01
    `);
    process.exit(0);
  }
}

// Run the script
preregisterDevices(options.count, options)
  .then(() => {
    console.log(`\n${colors.green}Done!${colors.reset}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
