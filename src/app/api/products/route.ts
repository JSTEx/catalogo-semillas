import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { createProductSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";
import { toProductDTO } from "@/lib/types";

export const runtime = "nodejs";

// Listado publico del catalogo.
export async function GET() {
  const rows = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));

  return NextResponse.json({ products: rows.map(toProductDTO) });
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

  const imageUrls =
    parsed.data.imageUrls && parsed.data.imageUrls.length > 0
      ? parsed.data.imageUrls
      : parsed.data.imageUrl
        ? [parsed.data.imageUrl]
        : [];

  // Sin existencias no puede figurar como disponible/pocas unidades.
  const status =
    parsed.data.stock <= 0 &&
    (parsed.data.status === "available" || parsed.data.status === "low_stock")
      ? "out_of_stock"
      : parsed.data.status;

  const [created] = await db
    .insert(products)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      status,
      imageUrl: imageUrls[0],
      imageUrls,
      priceCents: parsed.data.priceCents,
      stock: parsed.data.stock,
    })
    .returning();

  return NextResponse.json({ product: toProductDTO(created) }, { status: 201 });
}
