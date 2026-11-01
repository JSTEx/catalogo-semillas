// Guarda empresa de mensajeria y desglose cotizado por pedido.
// Uso: node --env-file=.env.local scripts/migrate-delivery-costs.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

try {
  await sql.unsafe(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_provider_id text,
      ADD COLUMN IF NOT EXISTS shipping_provider_base_cents integer,
      ADD COLUMN IF NOT EXISTS shipping_commission_bps integer,
      ADD COLUMN IF NOT EXISTS shipping_commission_cents integer
  `);
  console.log("Migracion de costos de envio aplicada correctamente.");
} finally {
  await sql.end();
}
