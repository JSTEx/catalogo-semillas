import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { allowedAdmins } from "@/lib/db/schema";

export const SUPER_ADMIN_EMAIL = "jecsitoshop@gmail.com";

export async function getAllowedAdminByEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  const [row] = await db
    .select()
    .from(allowedAdmins)
    .where(sql`lower(${allowedAdmins.email}) = ${normalized}`)
    .limit(1);
  return row ?? null;
}

export async function isSuperAdmin(email: string | null | undefined) {
  const row = await getAllowedAdminByEmail(email);
  return row?.role === "superadmin";
}

export async function isAllowedAdmin(email: string | null | undefined) {
  const row = await getAllowedAdminByEmail(email);
  return !!row;
}
