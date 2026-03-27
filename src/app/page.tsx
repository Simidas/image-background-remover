"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ImageState = {
  original: string | null;
  result: string | null;
};

type UserStatus = {
  isLoggedIn: boolean;
  user: { id: string; name: string; email: string; avatarUrl: string } | null;
  subscription: {
    plan: "free" | "pro";
    status: string;
    credits: number;
    currentPeriodEnd: string;
  } | null;
};

// ─── Helper: format credits display ─────────────────────────────────────────

function CreditsBadge({ credits, plan }: { credits: number; plan: string }) {
  const displayCredits = isNaN(credits) ? 20 : credits;
  if (plan === "pro") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
        ✨ Pro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-zinc-600 bg-zinc-100 px-3 py-1 rounded-full">
      💎 {displayCredits}/20 credits
    </span>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function UpgradeModal({
  onClose,
  onSignIn,
  isLoggedIn,
}: {
  onClose: () => void;
  onSignIn: () => void;
  isLoggedIn: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        alert(data.error ?? "创建订阅失败");
      }
    } catch {
      alert("创建订阅失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">⚡ Upgrade to Pro</h2>
        <p className="text-center text-zinc-500 mb-6">
          $8.8 / month — unlimited background removal
        </p>
        <ul className="space-y-2 mb-6 text-sm text-zinc-700">
          {[
            "✅ Unlimited background removal",
            "✅ Priority processing",
            "✅ No ads, no watermarks",
            "✅ Cancel anytime",
          ].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-bold rounded-full transition-colors"
          >
            {isLoading ? "⏳ Redirecting..." : "💳 Pay with PayPal ($8.8/mo)"}
          </button>
          {!isLoggedIn && (
            <button
              onClick={onSignIn}
              className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded-full transition-colors"
            >
              🔑 Sign in for 20 free credits/month
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 text-zinc-400 hover:text-zinc-600 text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Home Component ─────────────────────────────────────────────────────

function HomeContent() {
  const { data: session, status } = useSession();
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    result: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  // credits: number | null | undefined (NaN from arithmetic also possible)
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL params for subscription result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subStatus = params.get("subscription");
    if (subStatus === "success") {
      setSubscriptionStatus("success");
      setIsPro(true);
      setCredits(999999);
      // Clean URL
      window.history.replaceState({}, "", "/");
    } else if (subStatus === "cancelled") {
      setSubscriptionStatus("cancelled");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Fetch user status when session changes
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/status")
        .then((r) => r.json())
        .then((data: UserStatus) => {
          if (data.subscription) {
            setCredits(data.subscription.credits);
            setIsPro(data.subscription.plan === "pro");
          } else {
            setCredits(20);
          }
        })
        .catch(console.error);
    } else if (status === "unauthenticated") {
      setCredits(null);
      setIsPro(false);
    }
  }, [status]);

  // Close avatar menu when clicking outside
  useEffect(() => {
    if (!showAvatarMenu) return;
    const handler = () => setShowAvatarMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showAvatarMenu]);

  // Prevent browser default drag/drop behavior
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (
      !["image/jpeg", "image/png"].includes(file.type) &&
      !["jpeg", "jpg", "png"].includes(ext || "")
    ) {
      setError("Please upload JPG/PNG image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const original = e.target?.result as string;
      setImageState({ original, result: null });
      setIsUploaded(true);
      setShowOriginal(false);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveBg = async () => {
    if (!imageState.original) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageState.original }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "GUEST_DAILY_LIMIT" || data.code === "MONTHLY_LIMIT") {
          setShowUpgradeModal(true);
          throw new Error(data.error);
        }
        throw new Error(data.error || "Processing failed");
      }

      setImageState((prev) => ({ ...prev, result: data.result }));
      // Deduct credit display optimistically
      if (credits !== null && !isPro) {
        setCredits((c) => {
          if (c == null || isNaN(c)) return null;
          return Math.max(0, c - 1);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!imageState.result) return;
    const link = document.createElement("a");
    link.href = imageState.result;
    link.download = "removed-bg.png";
    link.click();
  };

  const handleReset = () => {
    setImageState({ original: null, result: null });
    setIsUploaded(false);
    setShowOriginal(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const displayImage = imageState.result
    ? showOriginal
      ? imageState.original
      : imageState.result
    : imageState.original;

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">🖼️</span>
          <span className="font-bold text-lg tracking-tight text-black">
            RemoveBG Pro
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse" />
          ) : session?.user ? (
            <>
              {credits !== null && (
                <CreditsBadge credits={credits} plan={isPro ? "pro" : "free"} />
              )}
              {!isPro && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Upgrade
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                  className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {session.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? ""}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  {!session.user.image && (
                    <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                      {session.user.name?.[0] ?? "?"}
                    </span>
                  )}
                  <span className="hidden sm:inline text-xs">▾</span>
                </button>
                {showAvatarMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-100">
                      Signed in as<br />
                      <span className="font-semibold text-zinc-700 truncate block">{session.user.name}</span>
                    </div>
                    <button
                      onClick={() => { setShowAvatarMenu(false); signOut(); }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      🚪 Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-full text-sm font-semibold text-zinc-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {/* ─── Subscription Status Banner ──────────────────────────────────────── */}
      {subscriptionStatus === "success" && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center text-green-700 text-sm font-semibold">
          ✅ Subscription activated! You are now a Pro user. Enjoy unlimited use!
        </div>
      )}
      {subscriptionStatus === "cancelled" && (
        <div className="mx-6 mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-zinc-600 text-sm">
          ❌ Subscription cancelled. You can upgrade anytime.
        </div>
      )}

      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-14 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black">
          ✨ One-click background removal
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          {session?.user
            ? isPro
              ? "Pro user — unlimited use"
              : `${credits ?? 20} credits remaining this month`
            : "Sign in for 20 credits/month · Pro for $8.8/mo"}
        </p>
      </div>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center px-6 pb-16 gap-8">
        {/* Upload Area */}
        {!isUploaded && (
          <div
            className={`w-full max-w-lg flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all select-none cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-300 bg-white hover:border-zinc-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-5xl mb-4">📤</div>
            <p className="text-lg font-medium text-zinc-700">
              {isDragging ? "Drop here to upload" : "Click to upload or take a photo"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">JPG/PNG, max 5MB</p>
            <p className="mt-1 text-xs text-zinc-400 sm:hidden">📷 Take a photo directly</p>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* Preview + Result Area */}
        {isUploaded && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-6">
            {/* Image Display */}
            <div className="relative w-full flex flex-col items-center">
              {displayImage ? (
                <div className="relative rounded-xl overflow-hidden shadow-lg">
                  {/* Chessboard background for transparency */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage}
                    alt={showOriginal ? "Original" : "Result"}
                    className="relative max-w-full rounded-xl"
                    style={{ maxHeight: "400px" }}
                  />
                  {imageState.result && (
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-sm px-3 py-1.5 rounded-full transition-colors"
                    >
                      {showOriginal ? "Show Result" : "Show Original"}
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-full h-64 border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center bg-white">
                  <p className="text-zinc-400">Preview area</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full text-center text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              {!imageState.result && (
                <button
                  onClick={handleRemoveBg}
                  disabled={isProcessing || !imageState.original}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>✨ Remove Background</>
                  )}
                </button>
              )}
              {imageState.result && (
                <>
                  <button
                    onClick={handleDownload}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-colors flex items-center gap-2"
                  >
                    ⬇️ Download PNG
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-semibold rounded-full transition-colors"
                  >
                    Process another
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Upgrade Prompt ─────────────────────────────────────────────────── */}
      {!session?.user && !isUploaded && (
        <div className="mx-6 mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-center">
          <p className="text-amber-800 font-semibold mb-1">Want unlimited use?</p>
          <p className="text-amber-600 text-sm mb-4">
            Sign in for 20 free credits/month · Pro for $8.8/mo
          </p>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full transition-colors text-sm"
          >
            See Pro plans
          </button>
        </div>
      )}

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center text-sm text-zinc-500">
        <p>
          © 2026{" "}
          <a
            href="https://github.com/Simidas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-800 transition-colors"
          >
            Simidas
          </a>{" "}
          · Powered by Remove.bg API
        </p>
      </footer>

      {/* ─── Upgrade Modal ──────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onSignIn={() => {
            setShowUpgradeModal(false);
            signIn("google");
          }}
          isLoggedIn={!!session?.user}
        />
      )}
    </div>
  );
}

// ─── Page Export (with SessionProvider) ──────────────────────────────────────

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  );
}
