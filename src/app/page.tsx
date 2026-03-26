"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type ImageState = {
  original: string | null;
  result: string | null;
};

export default function Home() {
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    result: null,
  });
  const [isDragging, setIsDragging] = useState(false);

  // Prevent browser default drag/drop behavior (stops macOS from opening dropped files)
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("请上传 JPG/PNG 图片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片需小于 10MB");
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "处理失败，请重试");
      }

      const data = await res.json();
      setImageState((prev) => ({ ...prev, result: data.result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败，请重试");
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
    ? (showOriginal ? imageState.original : imageState.result)
    : imageState.original;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans">
      {/* Hero */}
      <header className="flex flex-col items-center py-16 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black">
          🖼️ 一键去除图片背景
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          拖拽图片，最快 3 秒完成，无需注册
        </p>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center px-6 pb-16 gap-8">
        {/* Upload Area */}
        {!isUploaded && (
          <div
            className={`w-full max-w-lg flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-300 bg-white hover:border-zinc-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-5xl mb-4">📤</div>
            <p className="text-lg font-medium text-zinc-700">
              {isDragging ? "松开以上传" : "拖拽图片或点击上传"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">支持 JPG/PNG，最大 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
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
                    className="absolute inset-0 checkboard"
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
                    alt={showOriginal ? "原图" : "结果图"}
                    className="relative max-w-full rounded-xl"
                    style={{ maxHeight: "400px" }}
                  />
                  {imageState.result && (
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-sm px-3 py-1.5 rounded-full transition-colors"
                    >
                      {showOriginal ? "查看结果图" : "查看原图"}
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-full h-64 border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center bg-white">
                  <p className="text-zinc-400">图片预览区</p>
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
            <div className="flex gap-4">
              {!imageState.result && (
                <button
                  onClick={handleRemoveBg}
                  disabled={isProcessing || !imageState.original}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      处理中...
                    </>
                  ) : (
                    "✨ 移除背景"
                  )}
                </button>
              )}
              {imageState.result && (
                <>
                  <button
                    onClick={handleDownload}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-colors flex items-center gap-2"
                  >
                    ⬇️ 下载 PNG
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-semibold rounded-full transition-colors"
                  >
                    处理下一张
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
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
          · 使用 Remove.bg API
        </p>
        {process.env.NEXT_PUBLIC_BUILD_TIME && (
          <p className="mt-1 text-xs text-zinc-400">
            构建时间：{process.env.NEXT_PUBLIC_BUILD_TIME}
          </p>
        )}
      </footer>
    </div>
  );
}
