import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { createProductSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";

export const runtime = "nodejs";

// Listado publico del catalogo.
export async function GET() {
  const rows = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));

  return NextResponse.json({ products: rows });
}

// Crear producto (solo administradores autenticados).
export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const parsed = createProductSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);
  }

  const [created] = await db
    .insert(products)
    .values({
      name: parsed.data.name,
      isAvailable: parsed.data.isAvailable,
      imageUrl: parsed.data.imageUrl,
    })
    .returning();

  return NextResponse.json({ product: created }, { status: 201 });
}
