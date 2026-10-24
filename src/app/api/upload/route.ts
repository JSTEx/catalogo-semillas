import { NextResponse } from "next/server";
import sharp from "sharp";
import { validateImage } from "@/lib/file-validation";
import { uploadImage } from "@/lib/storage";
import { MAX_IMAGE_BYTES } from "@/lib/validation";
import { jsonError, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";

const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 88;

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const maxMb = MAX_IMAGE_BYTES / 1024 / 1024;

  // Rechazo temprano por tamano declarado.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_IMAGE_BYTES + 64 * 1024) {
    return jsonError(`La imagen supera el limite de ${maxMb}MB`, 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Formulario invalido", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Se requiere un archivo de imagen", 400);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return jsonError(`La imagen supera el limite de ${maxMb}MB`, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validacion estricta del contenido real (magic bytes), no del nombre.
  const result = validateImage(buffer, file.type);
  if (!result.ok) {
    return jsonError(result.error ?? "Imagen no valida", 400);
  }

  try {
    // Optimizar: redimensionar y convertir a WebP manteniendo máxima calidad percibida
    const optimized = await sharp(buffer)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer();

    const url = await uploadImage(optimized, "image/webp");
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return jsonError("No se pudo subir la imagen", 502);
  }
}
