/**
 * Database Package Entry Point
 * Re-exports Prisma Client for use by services
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Export the PrismaClient class
export { PrismaClient };

// Export all generated types
export * from '@prisma/client';

// Singleton instance for development/testing
let prisma: PrismaClient | undefined;

/**
 * Get a singleton PrismaClient instance
 * Useful for avoiding multiple client instances in development
 */
export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

/**
 * Disconnect the singleton PrismaClient
 * Call this during graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
        prisma = undefined;
    }
}

export * from './access';
export { initializeDatabase, checkDatabaseHealth } from './bootstrap';
export type { DatabaseBootstrapResult } from './bootstrap';
