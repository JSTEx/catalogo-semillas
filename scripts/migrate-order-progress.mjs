// Actualiza el ciclo de entrega y registra la verificacion del pago.
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
  await sql.unsafe(
    "ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'dispatched'",
  );
  await sql.unsafe(
    "UPDATE orders SET status = 'dispatched' WHERE status = 'in_transit'",
  );
  await sql.unsafe(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz",
  );
  const [verification] = await sql`
    SELECT
      (SELECT count(*)::int FROM orders WHERE status::text = 'in_transit') AS "oldTransit",
      (SELECT count(*)::int FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'payment_confirmed_at') AS "paymentColumn"
  `;
  if (verification.oldTransit !== 0 || verification.paymentColumn !== 1) {
    throw new Error("La migración de pedidos no pasó la verificación final");
  }
  console.log("Flujo de entrega y verificación de pagos aplicados correctamente.");
} finally {
  await sql.end();
}
