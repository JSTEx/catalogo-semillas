import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import sharp from "sharp";

// Ejecutar con: node --env-file=.env.local scripts/migrate-private-receipts.mjs
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicBucket = process.env.SUPABASE_STORAGE_BUCKET || "seeds";
const privateBucket = process.env.SUPABASE_RECEIPTS_BUCKET || "payment-receipts";
const maxBytes = 6 * 1024 * 1024;
const maxStoredBytes = 12 * 1024 * 1024;
const privatePrefix = "private-receipt:";

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Se requieren DATABASE_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
const storage = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage;

function getPublicObjectPath(url) {
  const parsed = new URL(url);
  if (parsed.origin !== new URL(supabaseUrl).origin) return null;
  const marker = "/storage/v1/object/public/";
  const index = parsed.pathname.indexOf(marker);
  if (index === -1) return null;

  const segments = parsed.pathname
    .slice(index + marker.length)
    .split("/")
    .map(decodeURIComponent);
  if (segments.shift() !== publicBucket || segments.length === 0) return null;
  return segments.join("/");
}

async function ensurePrivateBucket() {
  const list = await storage.listBuckets();
  if (list.error) throw new Error(`No se pudo consultar Storage: ${list.error.message}`);

  let bucket = list.data.find((item) => item.name === privateBucket);
  if (!bucket) {
    const created = await storage.createBucket(privateBucket, {
      public: false,
      fileSizeLimit: maxStoredBytes,
      allowedMimeTypes: ["image/webp"],
    });
    if (created.error) {
      const retry = await storage.listBuckets();
      if (retry.error) {
        throw new Error(`No se pudo verificar el bucket privado: ${retry.error.message}`);
      }
      bucket = retry.data.find((item) => item.name === privateBucket);
      if (!bucket) {
        throw new Error(`No se pudo crear el bucket privado: ${created.error.message}`);
      }
    } else {
      bucket = created.data;
    }
  }
  if (bucket.public) {
    throw new Error(`El bucket "${privateBucket}" existe, pero no es privado.`);
  }
}

async function main() {
  await ensurePrivateBucket();
  const rows = await sql`
    SELECT id, receipt_url
    FROM orders
    WHERE receipt_url IS NOT NULL
      AND receipt_url NOT LIKE ${privatePrefix + "%"}
  `;
  let migrated = 0;

  for (const row of rows) {
    const oldUrl = row.receipt_url;
    const oldPath = getPublicObjectPath(oldUrl);
    if (!oldPath) {
      throw new Error(
        `El comprobante del pedido ${row.id} no pertenece al bucket público esperado.`,
      );
    }

    const downloaded = await storage.from(publicBucket).download(oldPath);
    if (downloaded.error || !downloaded.data) {
      throw new Error(
        `No se pudo descargar el comprobante del pedido ${row.id}: ${downloaded.error?.message ?? "archivo ausente"}`,
      );
    }
    const original = Buffer.from(await downloaded.data.arrayBuffer());
    if (original.length === 0 || original.length > maxBytes) {
      throw new Error(`El comprobante del pedido ${row.id} tiene un tamaño no permitido.`);
    }

    let sanitized;
    try {
      sanitized = await sharp(original, {
        failOn: "error",
        limitInputPixels: 24_000_000,
      })
        .rotate()
        .resize(3000, 3000, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      throw new Error(`No se pudo decodificar el comprobante del pedido ${row.id}.`);
    }

    const newPath = `${crypto.randomUUID()}.webp`;
    const uploaded = await storage.from(privateBucket).upload(newPath, sanitized, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "0",
    });
    if (uploaded.error) {
      throw new Error(
        `No se pudo guardar el comprobante privado del pedido ${row.id}: ${uploaded.error.message}`,
      );
    }

    const newReference = `${privatePrefix}${newPath}`;
    const updated = await sql`
      UPDATE orders
      SET receipt_url = ${newReference}
      WHERE id = ${row.id} AND receipt_url = ${oldUrl}
      RETURNING id
    `;
    if (updated.length === 0) {
      await storage.from(privateBucket).remove([newPath]);
      continue;
    }

    const [usage] = await sql`
      SELECT
        EXISTS (
          SELECT 1 FROM products
          WHERE image_url = ${oldUrl}
             OR image_urls @> ${JSON.stringify([oldUrl])}::jsonb
        ) OR EXISTS (
          SELECT 1 FROM orders
          WHERE receipt_url = ${oldUrl}
             OR items @> ${JSON.stringify([{ imageUrl: oldUrl }])}::jsonb
        ) AS still_used
    `;
    if (!usage.still_used) {
      const removed = await storage.from(publicBucket).remove([oldPath]);
      if (removed.error) {
        throw new Error(
          `Se migro el pedido ${row.id}, pero no se pudo retirar el comprobante publico: ${removed.error.message}`,
        );
      }
    }
    migrated++;
  }

  console.log(`Comprobantes migrados a almacenamiento privado: ${migrated}`);
}

try {
  await main();
} finally {
  await sql.end();
}
