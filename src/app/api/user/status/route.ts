import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionByUserId } from "@/db";

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

  // Get subscription info from D1
  const sub = await getSubscriptionByUserId(userId);

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
          credits:
            typeof sub.credits === "number" && !isNaN(sub.credits)
              ? sub.credits
              : 20,
          currentPeriodEnd: sub.current_period_end,
        }
      : null,
  });
}
