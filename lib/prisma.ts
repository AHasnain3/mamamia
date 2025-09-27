// lib/prisma.ts
// Adjust the import path to match your generator output:
import { PrismaClient } from "@/app/generated/prisma"; // <-- uses Next.js '@' alias

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
