import { NextResponse } from "next/server";
import { validateImage } from "@/lib/file-validation";
import { uploadImage } from "@/lib/storage";
import { MAX_IMAGE_BYTES } from "@/lib/validation";
import { jsonError, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  // Rechazo temprano por tamano declarado.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_IMAGE_BYTES + 64 * 1024) {
    return jsonError("La imagen supera el limite de 2MB", 413);
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
    return jsonError("La imagen supera el limite de 2MB", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validacion estricta del contenido real (magic bytes), no del nombre.
  const result = validateImage(buffer, file.type);
  if (!result.ok) {
    return jsonError(result.error ?? "Imagen no valida", 400);
  }

  try {
    const url = await uploadImage(buffer, result.mime!);
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return jsonError("No se pudo subir la imagen", 502);
  }
}
