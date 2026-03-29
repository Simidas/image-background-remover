import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getUserByEmail, createUser, createSubscription } from "@/db";
import { generateId } from "@/lib/id";

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
      if (session.user?.email) {
        // Look up the correct database user_id by email
        // (JWT sub may differ from stored user_id if Google OAuth app changed)
        try {
          const dbUser = await getUserByEmail(session.user.email);
          if (dbUser) {
            session.user.id = dbUser.id;
          }
        } catch (err) {
          console.error("[session] failed to look up user by email:", err);
        }
      }
      return session;
    },
    // Auto-create user in DB on first sign-in
    async signIn({ user }) {
      console.log("[auth] signIn callback fired, user:", JSON.stringify({ id: user?.id, email: user?.email, name: user?.name }));
      if (!user?.email) {
        console.error("[auth] signIn: no email, rejecting");
        return false;
      }
      if (!user?.id) {
        console.error("[auth] signIn: no user.id, rejecting");
        return false;
      }

      try {
        const existing = await getUserByEmail(user.email);
        console.log("[auth] signIn: existing user:", existing ? "yes" : "no");

        if (!existing) {
          const userId = String(user.id);
          console.log("[auth] signIn: creating user with id=", userId);
          await createUser({
            id: userId,
            name: user.name ?? null,
            email: user.email,
            emailVerified: null,
            image: user.image ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log("[auth] signIn: user created, creating subscription");

          await createSubscription({
            id: generateId(),
            userId,
            paypalCustomerId: null,
            paypalSubscriptionId: null,
            plan: "free",
            status: "inactive",
            credits: 20,
            currentPeriodEnd: null,
            createdAt: new Date().toISOString(),
          });
          console.log("[auth] signIn: subscription created, done");
        }
        return true;
      } catch (err) {
        console.error("[auth] signIn error:", err);
        // Still allow sign-in even if DB write fails
        return true;
      }
    },
  },
  pages: {
    signIn: "/",
  },
});
