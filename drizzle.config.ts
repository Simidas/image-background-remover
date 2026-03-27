import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  // Local SQLite file used by drizzle-kit CLI (introspection, migrations).
  // The runtime application uses Cloudflare D1 via HTTP API — see src/db/index.ts.
  dbCredentials: {
    url: "./local.db",
  },
} satisfies Config;
