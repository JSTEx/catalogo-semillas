import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { createExpenseSchema } from "@/lib/validation";
import { requireAdmin, jsonError } from "@/lib/http";
import { toExpenseDTO } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  const rows = await db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.createdAt));

  return NextResponse.json({ expenses: rows.map(toExpenseDTO) });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const parsed = createExpenseSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);
  }

  const [created] = await db
    .insert(expenses)
    .values({
      concept: parsed.data.concept,
      category: parsed.data.category,
      amountCents: parsed.data.amountCents,
    })
    .returning();

  return NextResponse.json({ expense: toExpenseDTO(created) }, { status: 201 });
}