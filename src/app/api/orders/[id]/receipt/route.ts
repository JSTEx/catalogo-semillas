import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { MAX_IMAGE_BYTES, productIdSchema } from "@/lib/validation";
import { isSameOrigin, jsonError, getClientIp } from "@/lib/http";
import { checkReceiptRateLimit } from "@/lib/rate-limit";
import { validateImage } from "@/lib/file-validation";
import { uploadImage } from "@/lib/storage";
import { toPublicOrderDTO } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Sube el comprobante de pago de un pedido por parte del cliente.
 * El identificador es un UUID publico no adivinable (mismo usado en el
 * seguimiento). Se valida el contenido real de la imagen antes de subirla.
 */
export async function POST(req: Request, { params }: Params) {
  if (!isSameOrigin(req)) {
    return jsonError("Origen no permitido", 403);
  }

  const ip = getClientIp(req);
  const rl = await checkReceiptRateLimit(`ip:${ip}`);
  if (!rl.success) {
    return jsonError(
      "Demasiados intentos. Espera unos minutos e intentalo de nuevo.",
      429,
    );
  }

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return jsonError("Pedido no encontrado", 404);
  if (order.status === "cancelled") {
    return jsonError("Este pedido esta cancelado.", 409);
  }

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

  let url: string;
  try {
    url = await uploadImage(buffer, result.mime!);
  } catch {
    return jsonError("No se pudo subir la imagen", 502);
  }

  const [updated] = await db
    .update(orders)
    .set({ receiptUrl: url, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  if (!updated) return jsonError("Pedido no encontrado", 404);

  return NextResponse.json({ order: toPublicOrderDTO(updated) }, { status: 201 });
}
