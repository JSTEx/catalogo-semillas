import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AllowedImageMime } from "./file-validation";

let cached: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para el almacenamiento.",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

function getBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "seeds";
}

function getReceiptBucket(): string {
  return process.env.SUPABASE_RECEIPTS_BUCKET || "payment-receipts";
}

const MIME_TO_EXT: Record<AllowedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PRIVATE_RECEIPT_PREFIX = "private-receipt:";
const RECEIPT_OBJECT_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;
let receiptBucketCheck: Promise<void> | null = null;

export function isPrivateReceiptReference(value: string): boolean {
  return (
    value.startsWith(PRIVATE_RECEIPT_PREFIX) &&
    RECEIPT_OBJECT_PATH.test(value.slice(PRIVATE_RECEIPT_PREFIX.length))
  );
}

async function ensurePrivateReceiptBucket(): Promise<SupabaseClient> {
  const client = getAdminClient();
  if (!receiptBucketCheck) {
    receiptBucketCheck = (async () => {
      const { data, error } = await client.storage.listBuckets();
      if (error) {
        throw new Error(
          `No se pudo verificar el bucket privado: ${error.message}`,
        );
      }
      const bucket = data.find((item) => item.name === getReceiptBucket());
      if (!bucket) {
        throw new Error(
          `No existe el bucket privado de comprobantes "${getReceiptBucket()}".`,
        );
      }
      if (bucket.public) {
        throw new Error("El bucket de comprobantes debe ser privado.");
      }
    })();
  }
  try {
    await receiptBucketCheck;
  } catch (error) {
    receiptBucketCheck = null;
    throw error;
  }
  return client;
}

export async function uploadPrivateReceipt(buffer: Buffer): Promise<string> {
  const client = await ensurePrivateReceiptBucket();
  const objectPath = `${crypto.randomUUID()}.webp`;
  const { error } = await client.storage
    .from(getReceiptBucket())
    .upload(objectPath, buffer, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "0",
    });
  if (error) throw new Error(`Error al subir el comprobante: ${error.message}`);
  return `${PRIVATE_RECEIPT_PREFIX}${objectPath}`;
}

export async function downloadPrivateReceipt(reference: string): Promise<Buffer> {
  if (!isPrivateReceiptReference(reference)) {
    throw new Error("Referencia de comprobante privado no válida.");
  }
  const client = await ensurePrivateReceiptBucket();
  const objectPath = reference.slice(PRIVATE_RECEIPT_PREFIX.length);
  const { data, error } = await client.storage
    .from(getReceiptBucket())
    .download(objectPath);
  if (error) throw new Error(`Error al leer el comprobante: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteStoredImage(reference: string): Promise<boolean> {
  if (!isPrivateReceiptReference(reference)) {
    return deleteImageByUrl(reference);
  }

  const client = await ensurePrivateReceiptBucket();
  const objectPath = reference.slice(PRIVATE_RECEIPT_PREFIX.length);
  const { error } = await client.storage
    .from(getReceiptBucket())
    .remove([objectPath]);
  if (error) throw new Error(`Error al borrar el comprobante: ${error.message}`);
  return true;
}

/**
 * Sube una imagen a Supabase Storage con un nombre UUID aleatorio para
 * prevenir Directory Traversal / ejecucion de scripts. Devuelve la URL publica.
 */
export async function uploadImage(
  buffer: Buffer,
  mime: AllowedImageMime,
): Promise<string> {
  const client = getAdminClient();
  const bucket = getBucket();

  // Nombre aleatorio v4 + extension derivada del tipo REAL detectado.
  const objectPath = `${crypto.randomUUID()}.${MIME_TO_EXT[mime]}`;

  const { error } = await client.storage.from(bucket).upload(objectPath, buffer, {
    contentType: mime,
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) {
    throw new Error(`Error al subir la imagen: ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

/**
 * Extrae la ruta del objeto a partir de su URL publica de Supabase. Devuelve
 * null si la URL no pertenece al bucket configurado.
 */
function objectPathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    const rest = parsed.pathname.slice(index + marker.length);
    const [bucket, ...parts] = rest.split("/");
    if (bucket !== getBucket() || parts.length === 0) return null;
    return decodeURIComponent(parts.join("/"));
  } catch {
    return null;
  }
}

/** Elimina una imagen del bucket a partir de su URL publica. */
export async function deleteImageByUrl(url: string): Promise<boolean> {
  const objectPath = objectPathFromPublicUrl(url);
  if (!objectPath) return false;

  const client = getAdminClient();
  const { error } = await client.storage.from(getBucket()).remove([objectPath]);
  if (error) {
    throw new Error(`Error al borrar la imagen: ${error.message}`);
  }
  return true;
}
