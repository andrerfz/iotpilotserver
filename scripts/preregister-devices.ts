/**
 * Pre-registration script for manufacturing.
 *
 * Inserts N UNCLAIMED devices into the database with generated IOT-XXXX-YYYY IDs.
 * Run this before devices leave the factory. The IOT-XXXX-YYYY ID is printed on the
 * device label / QR code so customers can claim their device via the app.
 *
 * Usage:
 *   npx ts-node scripts/preregister-devices.ts --count=50 --output=devices.csv
 *   npx ts-node scripts/preregister-devices.ts --count=10   (outputs to stdout)
 *
 * Runs directly against DATABASE_URL — no Docker exec needed.
 * Set DATABASE_URL in .env.local or pass via env:
 *   DATABASE_URL=postgresql://... npx ts-node scripts/preregister-devices.ts --count=10
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
    }
}

// Charset: no 0/O/I/1 to avoid visual confusion on labels
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateDeviceId(): string {
    const bytes = crypto.randomBytes(8);
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) {
        part1 += CHARSET[bytes[i] % CHARSET.length];
        part2 += CHARSET[bytes[i + 4] % CHARSET.length];
    }
    return `IOT-${part1}-${part2}`;
}

function parseArgs(): { count: number; output: string | null } {
    const args = process.argv.slice(2);
    let count = 10;
    let output: string | null = null;

    for (const arg of args) {
        if (arg.startsWith('--count=')) {
            count = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--output=')) {
            output = arg.split('=')[1];
        }
    }

    if (isNaN(count) || count < 1) {
        console.error('Invalid --count value');
        process.exit(1);
    }

    return { count, output };
}

async function main() {
    const { count, output } = parseArgs();
    const prisma = new PrismaClient();

    try {
        console.log(`Registering ${count} UNCLAIMED devices...`);

        // Fetch existing deviceIds to avoid collisions
        const existing = await prisma.device.findMany({
            select: { deviceId: true }
        });
        const existingIds = new Set(existing.map(d => d.deviceId));

        // Generate unique IDs
        const newIds: string[] = [];
        let attempts = 0;
        const maxAttempts = count * 10;

        while (newIds.length < count && attempts < maxAttempts) {
            attempts++;
            const id = generateDeviceId();
            if (!existingIds.has(id) && !newIds.includes(id)) {
                newIds.push(id);
            }
        }

        if (newIds.length < count) {
            console.error(`Could only generate ${newIds.length} unique IDs after ${maxAttempts} attempts`);
            process.exit(1);
        }

        // Batch insert
        const now = new Date();
        const result = await prisma.device.createMany({
            data: newIds.map(deviceId => ({
                id: crypto.randomUUID(),
                deviceId,
                name: `Unclaimed Device ${deviceId}`,
                status: 'UNCLAIMED' as any,
                metadata: {},
                registeredAt: now,
                updatedAt: now,
            })),
            skipDuplicates: true,
        });

        console.log(`✅ Inserted ${result.count} devices`);

        // Build CSV
        const csvLines = ['deviceId,registeredAt', ...newIds.map(id => `${id},${now.toISOString()}`)];
        const csv = csvLines.join('\n');

        if (output) {
            fs.writeFileSync(output, csv, 'utf-8');
            console.log(`📄 Saved to ${output}`);
        } else {
            console.log('\n--- CSV OUTPUT ---');
            console.log(csv);
        }

    } finally {
        await prisma.$disconnect();
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
