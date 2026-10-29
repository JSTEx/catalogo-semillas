import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllowedAdminByEmail } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ allowed: false });
  const allowed = await getAllowedAdminByEmail(email);
  return NextResponse.json({ allowed: !!allowed, role: allowed?.role ?? null });
}
