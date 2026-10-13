// Agrega categoria y descripcion a products (catalogo general).
// Uso: node --env-file=.env.local scripts/migrate-categories.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

const statements = [
  `ALTER TABLE products
     ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'otros',
     ADD COLUMN IF NOT EXISTS description text`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)`,
];

for (const s of statements) {
  await sql.unsafe(s);
}

await sql.end();
console.log("Migracion de categorias y descripcion aplicada correctamente.");
