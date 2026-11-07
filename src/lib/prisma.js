// Cliente do Prisma 7 com driver adapter (better-sqlite3).
// No Prisma 7 o client é gerado em ./generated (veja o schema.prisma).
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
