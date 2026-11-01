import { NextResponse } from "next/server";
import sharp from "sharp";
import { validateImage } from "@/lib/file-validation";
import { uploadImage } from "@/lib/storage";
import { MAX_IMAGE_BYTES } from "@/lib/validation";
import { jsonError, readFormDataWithLimit, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";

const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 88;

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const maxMb = MAX_IMAGE_BYTES / 1024 / 1024;
  const formResult = await readFormDataWithLimit(
    req,
    MAX_IMAGE_BYTES + 64 * 1024,
  );
  if (!formResult.ok && formResult.reason === "too_large") {
    return jsonError(`La imagen supera el limite de ${maxMb}MB`, 413);
  }
  if (!formResult.ok) {
    return jsonError("Formulario invalido", 400);
  }

  const files = formResult.formData.getAll("file");
  const file = files[0];
  if (files.length !== 1) {
    return jsonError("Se requiere exactamente un archivo de imagen", 400);
  }
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

  let optimized: Buffer;
  try {
    optimized = await sharp(buffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
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
  } catch {
    return jsonError("La imagen esta dañada o sus dimensiones no son validas", 400);
  }

  try {
    const url = await uploadImage(optimized, "image/webp");
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return jsonError("No se pudo subir la imagen", 502);
  }
}
