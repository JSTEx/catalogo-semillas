// Agrega la galeria de imagenes (varias por producto) a products.
// Uso: node --env-file=.env.local scripts/migrate-product-images.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

const statements = [
  `ALTER TABLE products
     ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb`,
  // Backfill: los productos existentes usan su imagen actual como unica imagen.
  `UPDATE products
     SET image_urls = jsonb_build_array(image_url)
     WHERE image_urls = '[]'::jsonb
       AND image_url IS NOT NULL
       AND image_url <> ''`,
];

for (const s of statements) {
  await sql.unsafe(s);
}

const [{ n }] = await sql`
  SELECT count(*)::int AS n FROM products WHERE jsonb_array_length(image_urls) > 0
`;
await sql.end();
console.log(`Migracion de galeria aplicada. Productos con imagenes: ${n}.`);
