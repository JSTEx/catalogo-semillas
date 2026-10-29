import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { allowedAdmins } from "@/lib/db/schema";
import { getAdminUser } from "@/lib/admin/server";
import { SUPER_ADMIN_EMAIL } from "@/lib/admin/auth";
import { isSameOrigin, jsonError } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email("Correo invalido").max(254),
  role: z.enum(["admin"]).default("admin"),
});

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return jsonError("No autorizado", 401);
  if (admin.role !== "superadmin") return jsonError("No autorizado", 403);
  const rows = await db.select().from(allowedAdmins).orderBy(allowedAdmins.createdAt);
  return NextResponse.json({ admins: rows });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Origen no permitido", 403);
  const admin = await getAdminUser();
  if (!admin) return jsonError("No autorizado", 401);
  if (admin.role !== "superadmin") return jsonError("No autorizado", 403);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo invalido", 400);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Datos invalidos", 400);

  const email = parsed.data.email.toLowerCase().trim();
  if (email === SUPER_ADMIN_EMAIL) return jsonError("El superadmin no se puede modificar", 400);

  const [existing] = await db
    .select()
    .from(allowedAdmins)
    .where(sql`lower(${allowedAdmins.email}) = ${email}`)
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(allowedAdmins)
      .set({ email, role: "admin", updatedAt: new Date() })
      .where(sql`lower(${allowedAdmins.email}) = ${email}`)
      .returning();
    return NextResponse.json({ admin: updated });
  }
  const [created] = await db.insert(allowedAdmins).values({ email, role: "admin" }).returning();
  return NextResponse.json({ admin: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Origen no permitido", 403);
  const admin = await getAdminUser();
  if (!admin) return jsonError("No autorizado", 401);
  if (admin.role !== "superadmin") return jsonError("No autorizado", 403);

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  if (!email) return jsonError("Correo requerido", 400);
  if (email === SUPER_ADMIN_EMAIL) return jsonError("No se puede quitar al superadmin", 400);

  const [deleted] = await db
    .delete(allowedAdmins)
    .where(sql`lower(${allowedAdmins.email}) = ${email}`)
    .returning();
  if (!deleted) return jsonError("No encontrado", 404);
  return NextResponse.json({ ok: true });
}
