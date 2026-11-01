// Agrega estados de preparacion y listo al flujo de pedidos.
// Uso: node --env-file=.env.local scripts/migrate-order-progress.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

try {
  await sql.unsafe(
    "ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'preparing'",
  );
  await sql.unsafe("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready'");
  console.log("Estados de progreso de pedidos aplicados correctamente.");
} finally {
  await sql.end();
}
