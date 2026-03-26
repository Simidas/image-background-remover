import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Auto-create user in DB on first sign-in
    async signIn({ user }) {
      if (!user.email) return false;

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email!))
        .limit(1);

      if (existing.length === 0) {
        // Create user
        await db.insert(users).values({
          id: user.id!,
          name: user.name ?? null,
          email: user.email,
          emailVerified: null,
          image: user.image ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Create free subscription for new user
        await db.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId: user.id!,
          plan: "free",
          status: "inactive",
          credits: 20,
          createdAt: new Date().toISOString(),
        });
      }

      return true;
    },
  },
  pages: {
    signIn: "/",
  },
});
