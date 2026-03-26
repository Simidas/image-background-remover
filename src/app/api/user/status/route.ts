import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({
      isLoggedIn: false,
      user: null,
      subscription: null,
    });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        avatarUrl: session.user.image,
      },
      subscription: null,
    });
  }

  // Get subscription info from DB
  const subRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const sub = subRows[0] ?? null;

  return NextResponse.json({
    isLoggedIn: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      avatarUrl: session.user.image,
    },
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          credits: sub.credits,
          currentPeriodEnd: sub.currentPeriodEnd,
        }
      : null,
  });
}
