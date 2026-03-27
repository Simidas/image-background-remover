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
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Auto-create user in DB on first sign-in
    async signIn({ user }) {
      if (!user.email) return false;

      const existing = await getUserByEmail(user.email);

      if (!existing) {
        // Create user
        await createUser({
          id: user.id!,
          name: user.name ?? null,
          email: user.email,
          emailVerified: null,
          image: user.image ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Create free subscription for new user
        await createSubscription({
          id: generateId(),
          userId: user.id!,
          paypalCustomerId: null,
          paypalSubscriptionId: null,
          plan: "free",
          status: "inactive",
          credits: 20,
          currentPeriodEnd: null,
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
