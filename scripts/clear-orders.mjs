// Elimina todos los pedidos y reinicia la secuencia de IDs de orders.
// Uso: npm run db:clear-orders
import postgres from "postgres";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  /* sin .env.local */
}
try {
  process.loadEnvFile?.(".env");
} catch {
  /* sin .env */
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Falta la variable DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

try {
  await sql.unsafe(`TRUNCATE orders RESTART IDENTITY`);
  console.log("Pedidos eliminados y numeracion de orders reiniciada.");
} catch (err) {
  console.error("Error al limpiar orders:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
