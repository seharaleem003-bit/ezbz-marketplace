import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Used by the Prisma CLI (migrate, studio, generate) — needs the direct
// (unpooled) Neon connection because the migration engine relies on
// prepared statements that Neon's pooled/PgBouncer connection doesn't
// support. The runtime PrismaClient (lib/prisma.ts) connects separately
// via the @prisma/adapter-neon driver adapter using the pooled URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
