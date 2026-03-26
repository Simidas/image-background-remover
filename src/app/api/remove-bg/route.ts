import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { subscriptions, usageLogs } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "crypto";

const GUEST_COOKIE_NAME = "rb_guest_token";
const GUEST_DAILY_LIMIT = 1;
const FREE_USER_MONTHLY_LIMIT = 20;

function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function getMonthStartUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// Get or create a guest token from cookies
async function getGuestToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE_NAME);
  if (existing?.value) return existing.value;

  const token = crypto.randomUUID();
  cookieStore.set(GUEST_COOKIE_NAME, token, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });
  return token;
}

// Check if guest has used their daily quota
async function checkGuestQuota(guestToken: string): Promise<{ allowed: boolean; remaining: number }> {
  const todayStart = getTodayUTC();

  const todayLogs = await db
    .select()
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.guestToken, guestToken),
        eq(usageLogs.action, "remove_bg"),
        gte(usageLogs.createdAt, todayStart)
      )
    );

  const used = todayLogs.reduce((sum, l) => sum + l.creditsUsed, 0);
  return {
    allowed: used < GUEST_DAILY_LIMIT,
    remaining: Math.max(0, GUEST_DAILY_LIMIT - used),
  };
}

// Check if logged-in user has remaining credits
async function checkUserCredits(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  isPro: boolean;
  sub: typeof subscriptions.$inferSelect | null;
}> {
  const subRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const sub = subRows[0] ?? null;

  // Pro users: unlimited
  if (sub?.plan === "pro" && sub?.status === "active") {
    return { allowed: true, remaining: 999999, isPro: true, sub };
  }

  const monthlyLimit = FREE_USER_MONTHLY_LIMIT;
  const remaining = sub?.credits ?? monthlyLimit;

  return { allowed: remaining > 0, remaining, isPro: false, sub };
}

// Record usage
async function recordUsage(params: {
  userId?: string;
  guestToken?: string;
  creditsUsed: number;
}) {
  await db.insert(usageLogs).values({
    id: crypto.randomUUID(),
    userId: params.userId,
    guestToken: params.guestToken,
    action: "remove_bg",
    creditsUsed: params.creditsUsed,
    createdAt: new Date().toISOString(),
  });
}

// Deduct credits from user
async function deductCredits(userId: string) {
  await db
    .update(subscriptions)
    .set({
      credits: sql`${subscriptions.credits} - 1`,
    })
    .where(eq(subscriptions.userId, userId));
}

export async function POST(req: NextRequest) {
  // Rate limit check — basic
  const { image } = await req.json();
  if (!image) {
    return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  let guestToken: string | undefined;
  let guestUsed = false;

  if (!userId) {
    // 🚶 Guest flow
    guestToken = await getGuestToken();
    const { allowed, remaining } = await checkGuestQuota(guestToken);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "今日免费次数已用完，请登录获取更多额度",
          code: "GUEST_DAILY_LIMIT",
          remaining: 0,
        },
        { status: 402 }
      );
    }

    guestUsed = true;
  } else {
    // 👤 Logged-in user flow
    const { allowed, remaining, isPro } = await checkUserCredits(userId);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "本月额度已用完，请升级到 Pro 获取无限次使用",
          code: "MONTHLY_LIMIT",
          remaining: 0,
          isPro,
        },
        { status: 402 }
      );
    }

    if (!isPro) {
      await deductCredits(userId);
    }
  }

  // Call remove.bg API
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "服务器未配置 REMOVE_BG_API_KEY" },
      { status: 500 }
    );
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");
  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer], { type: mimeType }), "image.png");
  formData.append("size", "auto");
  formData.append("format", "png");
  formData.append("channels", "rgba");

  let resultBase64: string;
  try {
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Remove.bg API error:", response.status, errorText);
      if (response.status === 402) {
        return NextResponse.json(
          { error: "API 免费额度已用完，请购买付费套餐" },
          { status: 502 }
        );
      }
      return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
    }

    const arrayBuffer = await response.arrayBuffer();
    resultBase64 = Buffer.from(arrayBuffer).toString("base64");
  } catch (err) {
    console.error("Remove bg error:", err);
    return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
  }

  // Record usage (after successful API call)
  await recordUsage({
    userId,
    guestToken,
    creditsUsed: 1,
  });

  const resultDataUrl = `data:image/png;base64,${resultBase64}`;
  return NextResponse.json({ result: resultDataUrl });
}
