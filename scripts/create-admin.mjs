import bcrypt from "bcryptjs";
import postgres from "postgres";

// Carga variables desde .env.local / .env si existen (Node 20+).
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

const username = process.argv[2] ?? process.env.ADMIN_USERNAME;
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error(
    "Uso: npm run create-admin -- <usuario> <contrasena>\n" +
      "  o define ADMIN_USERNAME y ADMIN_PASSWORD en el entorno.",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("La contrasena debe tener al menos 8 caracteres.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Falta la variable DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false });

try {
  const hash = await bcrypt.hash(password, 12);

  await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${hash})
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `;

  console.log(`Administrador "${username}" creado/actualizado correctamente.`);
} catch (err) {
  console.error("Error al crear el administrador:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
