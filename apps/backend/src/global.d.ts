// packages/core uses `typeof window !== 'undefined'` guards for browser/server detection.
// Declare window as unknown so TypeScript accepts typeof checks in Node.js context.
declare const window: unknown;
