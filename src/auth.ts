import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import authConfig from "./auth.config";
import { db } from "@/lib/db";
import { accounts, customers, orders, sessions, verificationTokens } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: customers,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any,
  session: { strategy: "database" },
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (!user?.email) return;
      try {
        const email = user.email.toLowerCase();
        await db
          .update(orders)
          .set({ customerId: user.id as string })
          .where(eq(orders.customerEmail, email));
      } catch {
        // ignore
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
