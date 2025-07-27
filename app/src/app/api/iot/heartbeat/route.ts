// app/src/app/api/iot/heartbeat/route.ts
/**
 * IoT Heartbeat Endpoint Alias
 * 
 * This is an alias for /api/heartbeat to maintain consistency in the IoT API namespace.
 * All IoT device endpoints are under /api/iot/* for clarity.
 * 
 * - /api/iot/register   → Device registration
 * - /api/iot/heartbeat  → Device heartbeat (this file)
 * 
 * The actual implementation is in /api/heartbeat/route.ts
 */
export { POST } from '../../heartbeat/route';
export { dynamic, revalidate, fetchCache } from '../../heartbeat/route';
