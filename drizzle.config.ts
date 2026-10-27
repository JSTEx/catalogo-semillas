import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next carga .env.local; dotenv/config solo lee .env. Damos prioridad a
// .env.local para que `db:push` use la misma base que la app.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
