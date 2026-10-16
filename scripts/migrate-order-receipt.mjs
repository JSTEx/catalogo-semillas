import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL no esta definido");
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

async function main() {
  try {
    const statements = [
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_url text",
    ];

    for (const statement of statements) {
      await sql.unsafe(statement);
    }

    console.log("Migracion de comprobante de pago aplicada correctamente.");
  } catch (error) {
    console.error("Error aplicando migracion:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
