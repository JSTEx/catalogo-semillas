// Agrega la opcion de ocultar productos del catalogo publico.
// Uso: node --env-file=.env.local scripts/migrate-product-visibility.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

try {
  await sql.unsafe(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_products_is_hidden ON products (is_hidden)
  `);
  console.log("Migracion de visibilidad de productos aplicada correctamente.");
} finally {
  await sql.end();
}
