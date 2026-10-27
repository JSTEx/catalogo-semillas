import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { productIdSchema, updateProductSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";
import { toProductDTO } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const parsed = updateProductSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);
  }

  const [current] = await db
    .select()
    .from(products)
    .where(eq(products.id, id));
  if (!current) return jsonError("Producto no encontrado", 404);

  const update: Partial<typeof products.$inferInsert> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  // Mantiene coherentes estado y existencias: un producto sin stock no puede
  // quedar como disponible o con pocas unidades.
  const nextStock = parsed.data.stock ?? current.stock;
  const nextStatus = parsed.data.status ?? current.status;
  if (
    nextStock <= 0 &&
    (nextStatus === "available" || nextStatus === "low_stock")
  ) {
    update.status = "out_of_stock";
  }

  if (parsed.data.imageUrls && parsed.data.imageUrls.length > 0) {
    // La portada es siempre la primera imagen de la galeria.
    update.imageUrl = parsed.data.imageUrls[0];
  } else if (parsed.data.imageUrl) {
    // Solo se actualizo la portada (p. ej. desde el editor de imagen):
    // conserva el resto de la galeria y evita duplicar la portada.
    const rest = (current.imageUrls ?? []).filter(
      (u) => u !== parsed.data.imageUrl,
    );
    update.imageUrls = [parsed.data.imageUrl, ...rest];
  }

  const [updated] = await db
    .update(products)
    .set(update)
    .where(eq(products.id, id))
    .returning();

  if (!updated) return jsonError("Producto no encontrado", 404);

  return NextResponse.json({ product: toProductDTO(updated) });
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning();

  if (!deleted) return jsonError("Producto no encontrado", 404);

  return NextResponse.json({ ok: true, id: deleted.id });
}
