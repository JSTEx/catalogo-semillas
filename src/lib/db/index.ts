import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// Reutiliza la conexion en desarrollo para evitar agotar el pool con HMR.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    max: 1, // Serverless: una conexion por instancia
    prepare: false, // Compatible con transaction pooler (Supabase/pgBouncer)
    idle_timeout: 20,
    connect_timeout: 15,
    max_lifetime: 60 * 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
