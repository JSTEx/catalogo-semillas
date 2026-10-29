import { getSession } from "@/lib/auth/session";
import { auth } from "@/auth";
import { getAllowedAdminByEmail } from "./auth";

export async function getAdminUser() {
  // JWT session (current login)
  const jwt = await getSession();
  if (jwt) {
    // try to see if username is email
    const allowed = await getAllowedAdminByEmail(jwt.username);
    if (allowed) return { type: "jwt" as const, email: allowed.email, role: allowed.role, username: jwt.username };
    // also allow if username equals super admin email
    if (jwt.username?.toLowerCase().trim() === "jecsitoshop@gmail.com") {
      return { type: "jwt" as const, email: "jecsitoshop@gmail.com", role: "superadmin" as const, username: jwt.username };
    }
  }
  // NextAuth session
  const session = await auth();
  const email = session?.user?.email;
  if (email) {
    const allowed = await getAllowedAdminByEmail(email);
    if (allowed) return { type: "google" as const, email: allowed.email, role: allowed.role, name: session?.user?.name };
  }
  return null;
}

export async function requireAdminAccess() {
  const user = await getAdminUser();
  if (!user) return null;
  return user;
}
