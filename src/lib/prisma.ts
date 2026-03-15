import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDev = process.env.NODE_ENV !== "production";
const forcePostgres = process.env.DB_TYPE === "postgres";

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: (isDev && !forcePostgres) ? "file:./dev.db" : process.env.DATABASE_URL
    }
  }
});

if (isDev) globalForPrisma.prisma = prisma;
