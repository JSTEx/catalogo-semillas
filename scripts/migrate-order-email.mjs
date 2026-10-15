// Agrega correo del cliente y su preferencia de notificaciones a orders.
// Uso: node --env-file=.env.local scripts/migrate-order-email.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});

const statements = [
  `ALTER TABLE orders
     ADD COLUMN IF NOT EXISTS customer_email text,
     ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT false`,
];

for (const s of statements) {
  await sql.unsafe(s);
}

await sql.end();
console.log("Migracion de correo del cliente y notificaciones aplicada correctamente.");
