import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { from } = await searchParams;
  const safeFrom = from && from.startsWith("/admin") ? from : "/admin";

  return <LoginForm redirectTo={safeFrom} />;
}
