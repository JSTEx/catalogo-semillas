import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { MAX_IMAGE_BYTES, productIdSchema } from "@/lib/validation";
import {
  isSameOrigin,
  jsonError,
  getClientIp,
  readFormDataWithLimit,
  requireAdmin,
} from "@/lib/http";
import { checkReceiptRateLimit } from "@/lib/rate-limit";
import { validateImage } from "@/lib/file-validation";
import {
  downloadPrivateReceipt,
  uploadPrivateReceipt,
} from "@/lib/storage";
import { toPublicOrderDTO } from "@/lib/types";
import sharp from "sharp";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order?.receiptUrl?.startsWith("private-receipt:")) {
    return jsonError("Comprobante no encontrado", 404);
  }

  try {
    const image = await downloadPrivateReceipt(order.receiptUrl);
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="comprobante.webp"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonError("No se pudo cargar el comprobante", 502);
  }
}

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
  if (order.payment !== "transferencia") {
    return jsonError("Este pedido no es por transferencia.", 409);
  }
  if (order.paymentConfirmedAt) {
    return jsonError("El pago de este pedido ya fue confirmado.", 409);
  }
  if (order.receiptUrl) {
    return jsonError("Ya se subio un comprobante para este pedido.", 409);
  }

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

  let sanitized: Buffer;
  try {
    sanitized = await sharp(buffer, {
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
    return jsonError(
      "La imagen esta dañada o sus dimensiones no son validas",
      400,
    );
  }

  let url: string;
  try {
    url = await uploadPrivateReceipt(sanitized);
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
