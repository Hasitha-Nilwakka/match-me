import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

//This file sets up a singleton instance of PrismaClient to avoid multiple instances in development mode.
//We can use this if we want to access the database directly from the frontend (for example server-side rendering or static site generation).
//We can ignore this file if we only want to access the database from the backend via API calls.
