import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { productIdSchema, updateExpenseSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";
import { toExpenseDTO } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
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

  const parsed = updateExpenseSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.concept !== undefined) values.concept = parsed.data.concept;
  if (parsed.data.category !== undefined) values.category = parsed.data.category;
  if (parsed.data.amountCents !== undefined) values.amountCents = parsed.data.amountCents;
  if (parsed.data.notes !== undefined) values.notes = parsed.data.notes;
  if (parsed.data.imageUrls !== undefined) {
    const imageUrls = parsed.data.imageUrls.filter((u) => typeof u === "string" && u.length > 0);
    values.imageUrls = imageUrls;
    values.imageUrl = imageUrls[0] ?? null;
  } else if (parsed.data.imageUrl !== undefined) {
    values.imageUrl = parsed.data.imageUrl;
    values.imageUrls = parsed.data.imageUrl ? [parsed.data.imageUrl] : [];
  }

  const [updated] = await db
    .update(expenses)
    .set(values)
    .where(eq(expenses.id, id))
    .returning();

  if (!updated) return jsonError("Gasto no encontrado", 404);

  return NextResponse.json({ expense: toExpenseDTO(updated) });
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  if (!productIdSchema.safeParse(id).success) {
    return jsonError("Identificador no valido", 400);
  }

  const [deleted] = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning();
  if (!deleted) return jsonError("Gasto no encontrado", 404);

  return NextResponse.json({ ok: true, id: deleted.id });
}