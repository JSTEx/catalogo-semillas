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

const MIME_TO_EXT: Record<AllowedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
