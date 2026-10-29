import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { auth } from "@/auth";
import { getAllowedAdminByEmail } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getSession();
  if (session) {
    const allowed = await getAllowedAdminByEmail(session.username);
    if (allowed || session.username?.toLowerCase().trim() === "jecsitoshop@gmail.com") {
      redirect("/admin");
    }
  }

  const googleSession = await auth();
  const email = googleSession?.user?.email;
  if (email) {
    const allowed = await getAllowedAdminByEmail(email);
    if (allowed) {
      redirect("/admin");
    }
  }

  const { from } = await searchParams;
  const safeFrom = from && from.startsWith("/admin") ? from : "/admin";

  return <LoginForm redirectTo={safeFrom} />;
}
