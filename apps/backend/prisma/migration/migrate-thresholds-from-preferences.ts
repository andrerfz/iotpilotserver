/**
 * One-time migration: copy per-device alert thresholds from the legacy
 * UserPreference store (category DEVICE_SETTINGS, keys
 * `device_<internalId>_sensorTempThreshold` / `_batteryThreshold`) into the
 * `thresholds` table, which is now the single source of truth read by the alert
 * evaluator (record-sensor-reading.handler) and managed by the "Umbrales" modal.
 *
 * Idempotent: skips a device+metric that already has a threshold row. Safe to
 * re-run. Run inside the backend container:
 *   docker exec <backend> npx tsx apps/backend/prisma/migration/migrate-thresholds-from-preferences.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MetricMap {
  suffix: string;
  metricName: string;
  operator: string;
  unit: string;
  name: string;
}

// Match what the "Umbrales" modal (threshold-config-sheet) would create, so the
// modal displays/updates these rows in place instead of duplicating them.
const METRICS: MetricMap[] = [
  { suffix: 'sensorTempThreshold', metricName: 'sensor_temp', operator: 'GREATER_THAN', unit: '°C', name: 'Sensor Temp' },
  { suffix: 'batteryThreshold',    metricName: 'battery',     operator: 'LESS_THAN',    unit: '%',  name: 'Battery Low' },
];

async function main(): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const m of METRICS) {
    const prefs = await prisma.userPreference.findMany({
      where: { category: 'DEVICE_SETTINGS', key: { endsWith: `_${m.suffix}` } },
    });

    for (const pref of prefs) {
      const match = pref.key.match(new RegExp(`^device_(.+)_${m.suffix}$`));
      if (!match) { skipped++; continue; }
      const deviceId = match[1];

      const value = parseFloat(pref.value);
      if (!Number.isFinite(value)) { skipped++; continue; }

      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        select: { id: true, customerId: true },
      });
      if (!device?.customerId) { skipped++; continue; }

      const existing = await prisma.threshold.findFirst({
        where: { deviceId, metricName: m.metricName, deletedAt: null },
      });
      if (existing) { skipped++; continue; }

      await prisma.threshold.create({
        data: {
          deviceId,
          customerId: device.customerId,
          name: m.name,
          description: 'Migrated from device settings',
          metricName: m.metricName,
          operator: m.operator,
          value,
          unit: m.unit,
          severity: 'HIGH',
          enabled: true,
          type: 'STATIC',
          cooldownMinutes: 5,
        },
      });
      created++;
      console.log(`  + ${m.metricName} for device ${deviceId} = ${value}${m.unit}`);
    }
  }

  console.log(`\n✅ Threshold migration complete: created=${created}, skipped=${skipped}`);
}

main()
  .catch((e) => { console.error('❌ Migration failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
