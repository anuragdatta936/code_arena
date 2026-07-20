import { PrismaClient } from "@prisma/client";

// A single shared instance — avoids exhausting Postgres connections by
// creating a new client per request/module in dev hot-reload.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
