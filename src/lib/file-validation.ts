import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from "./validation";

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export interface ImageValidationResult {
  ok: boolean;
  mime?: AllowedImageMime;
  ext?: "jpg" | "png" | "webp";
  error?: string;
}

/**
 * Detecta el tipo MIME real de una imagen examinando sus "magic bytes".
 * No confia en el Content-Type ni en la extension enviada por el cliente.
 */
export function detectImageMime(buffer: Buffer): AllowedImageMime | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  return null;
}

const MIME_TO_EXT: Record<AllowedImageMime, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateImage(
  buffer: Buffer,
  declaredMime: string,
): ImageValidationResult {
  if (buffer.byteLength === 0) {
    return { ok: false, error: "El archivo esta vacio" };
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "La imagen supera el limite de 2MB" };
  }

  const detected = detectImageMime(buffer);
  if (!detected) {
    return { ok: false, error: "El archivo no es una imagen valida (JPG/PNG/WEBP)" };
  }
  if (!ALLOWED_IMAGE_MIME.includes(detected)) {
    return { ok: false, error: "Tipo de imagen no permitido" };
  }
  if (detected !== declaredMime) {
    // El tipo declarado no coincide con el contenido real => rechazar.
    return { ok: false, error: "El tipo MIME declarado no coincide con el archivo" };
  }

  return { ok: true, mime: detected, ext: MIME_TO_EXT[detected] };
}
