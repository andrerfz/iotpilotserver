import { PrismaClient } from '@prisma/client';

// Create a singleton instance of PrismaClient to be used across the application
// This prevents multiple instances of PrismaClient in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;