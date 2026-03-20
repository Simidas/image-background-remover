import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
    }

    const apiKey = process.env.CLIPDROP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务器未配置 CLIPDROP_API_KEY" },
        { status: 500 }
      );
    }

    // Convert base64 to Blob
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    const formData = new FormData();
    formData.append("image_file", new Blob([imageBuffer], { type: mimeType }), "image.png");

    const response = await fetch("https://clipdrop-api.co/remove-background/v1/remove_background", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Clipdrop API error:", response.status, errorText);
      return NextResponse.json(
        { error: "处理失败，请重试" },
        { status: 500 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString("base64");
    const resultDataUrl = `data:image/png;base64,${resultBase64}`;

    return NextResponse.json({ result: resultDataUrl });
  } catch (error) {
    console.error("Remove bg error:", error);
    return NextResponse.json(
      { error: "处理失败，请重试" },
      { status: 500 }
    );
  }
}
