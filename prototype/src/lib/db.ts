import "server-only";
import { PrismaClient } from "@prisma/client";

// Single Prisma client per server process (survives dev hot reloads).
// "server-only" makes the build fail if this module is ever imported by browser code.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
