import { auth } from "@/auth";
import { getAllowedAdminByEmail } from "./auth";

export async function getAdminUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (email) {
    const allowed = await getAllowedAdminByEmail(email);
    if (allowed) {
      return {
        type: "google" as const,
        email: allowed.email,
        role: allowed.role,
        name: session.user?.name,
      };
    }
  }
  return null;
}

export async function requireAdminAccess() {
  const user = await getAdminUser();
  if (!user) return null;
  return user;
}
