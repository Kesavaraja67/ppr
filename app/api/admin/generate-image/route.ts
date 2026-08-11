import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB byte cap

/**
 * Helper to generate a photorealistic produce photo using Pollinations AI
 * as a seamless fallback when Gemini Imagen 3 returns 404/502 on free API keys.
 */
async function generateFallbackAIImage(prompt: string): Promise<string | null> {
  try {
    const promptStr = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${promptStr}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;

    const mime = res.headers.get("content-type") || "";
    if (!mime.toLowerCase().startsWith("image/")) return null;

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) return null;

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error("[generate-image] Fallback AI image generation failed:", err);
    return null;
  }
}

/**
 * POST /api/admin/generate-image
 * Generates a product photo using Gemini Imagen with seamless AI fallback.
 * Uses one universal studio food photography prompt.
 */
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name_en?: string; name_ta?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name_en } = body;
  const trimmedName = name_en?.trim();
  if (!trimmedName) {
    return NextResponse.json(
      { error: "name_en is required for image generation" },
      { status: 400 }
    );
  }

  if (trimmedName.length > 100) {
    return NextResponse.json(
      { error: "name_en exceeds maximum length of 100 characters" },
      { status: 400 }
    );
  }

  const prompt = `Studio product photo of fresh ${trimmedName}, isolated on white background, food photography`;
  const apiKey = process.env.GEMINI_API_KEY;
  let imageDataUrl: string | null = null;

  // 1. Try Gemini Imagen 3 if API Key is configured
  if (apiKey) {
    try {
      let res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              outputMimeType: "image/png",
            },
          }),
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const base64Image = data?.predictions?.[0]?.bytesBase64Encoded ?? data?.generatedImages?.[0]?.image?.imageBytes;
        if (base64Image) imageDataUrl = `data:image/png;base64,${base64Image}`;
      } else {
        await res.text().catch(() => {}); // Consume body stream before retrying
        // Retry with generateImages endpoint using header authentication
        res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              prompt,
              config: {
                numberOfImages: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png",
              },
            }),
            signal: AbortSignal.timeout(15_000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const base64Image = data?.generatedImages?.[0]?.image?.imageBytes ?? data?.predictions?.[0]?.bytesBase64Encoded;
          if (base64Image) imageDataUrl = `data:image/png;base64,${base64Image}`;
        }
      }
    } catch (err) {
      console.error("[generate-image] Gemini fetch error:", err);
    }
  }

  // 2. Seamless AI Fallback (works on free API keys when Imagen returns 404)
  if (!imageDataUrl) {
    imageDataUrl = await generateFallbackAIImage(prompt);
  }

  if (!imageDataUrl) {
    return NextResponse.json(
      { error: "Image generation failed. Please try again or upload a photo manually." },
      { status: 502 }
    );
  }

  return NextResponse.json({ imageDataUrl });
}
