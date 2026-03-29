import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getSubscriptionByUserId,
  ensureSubscription,
  getUsageLogsByGuestToday,
  insertUsageLog,
  decrementCredits,
} from "@/db";
import { cookies } from "next/headers";
import { generateId } from "@/lib/id";

const GUEST_COOKIE_NAME = "rb_guest_token";
const GUEST_DAILY_LIMIT = 1;
const FREE_USER_MONTHLY_LIMIT = 20;

function getTodayUTC() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

// Get or create a guest token from cookies
async function getGuestToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE_NAME);
  if (existing?.value) return existing.value;

  const token = generateId();
  cookieStore.set(GUEST_COOKIE_NAME, token, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });
  return token;
}

// Check if guest has used their daily quota
async function checkGuestQuota(
  guestToken: string
): Promise<{ allowed: boolean; remaining: number }> {
  const todayStart = getTodayUTC();

  const todayLogs = await getUsageLogsByGuestToday(guestToken, todayStart);

  const used = todayLogs.reduce((sum, l) => sum + l.credits_used, 0);
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
}> {
  let sub = await getSubscriptionByUserId(userId);

  // If no subscription exists, create one with 20 credits
  if (!sub) {
    await ensureSubscription(userId);
    sub = await getSubscriptionByUserId(userId);
  }

  // Pro users: unlimited
  if (sub?.plan === "pro" && sub?.status === "active") {
    return { allowed: true, remaining: 999999, isPro: true };
  }

  const monthlyLimit = FREE_USER_MONTHLY_LIMIT;
  const remaining = sub?.credits ?? monthlyLimit;

  return { allowed: remaining > 0, remaining, isPro: false };
}

// Record usage
async function recordUsage(params: {
  userId?: string;
  guestToken?: string;
  creditsUsed: number;
}) {
  await insertUsageLog({
    id: generateId(),
    userId: params.userId,
    guestToken: params.guestToken,
    action: "remove_bg",
    creditsUsed: params.creditsUsed,
    createdAt: new Date().toISOString(),
  });
}

/** Convert ArrayBuffer to base64 string (Edge/Workers compatible) */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert base64 string to Uint8Array (Edge/Workers compatible) */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function POST(req: NextRequest) {
  const { image } = await req.json();
  if (!image) {
    return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  let guestToken: string | undefined;

  if (!userId) {
    // Guest flow
    guestToken = await getGuestToken();
    const { allowed } = await checkGuestQuota(guestToken);

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
  } else {
    // Logged-in user flow — ensure subscription exists first
    await ensureSubscription(userId);

    const { allowed, isPro } = await checkUserCredits(userId);

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
      // Atomically decrement and verify the row exists
      const result = await decrementCredits(userId);
      if (!result) {
        // Subscription didn't exist or had no credits — re-create and try again
        await ensureSubscription(userId);
        await decrementCredits(userId);
      }
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
  const imageBuffer = base64ToUint8Array(base64Data);
  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const formData = new FormData();
  formData.append(
    "image_file",
    new Blob([imageBuffer as BlobPart], { type: mimeType }),
    "image.png"
  );
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
    resultBase64 = arrayBufferToBase64(arrayBuffer);
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
