import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Helper to generate a photorealistic produce photo using Pollinations AI
 * as a seamless fallback when Gemini Imagen 3 returns 404/502 on free API keys.
 */
async function generateFallbackAIImage(nameEn: string, category: string): Promise<string | null> {
  try {
    const categoryLabel = category === "fruit" ? "fresh fruit" : category === "grocery" ? "grocery product" : "fresh vegetable";
    const promptStr = encodeURIComponent(`high quality photorealistic e-commerce studio product photo of ${nameEn.trim()} ${categoryLabel} on plain white background isolated studio lighting`);
    const imageUrl = `https://image.pollinations.ai/prompt/${promptStr}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error("[generate-image] Fallback AI image generation failed:", err);
    return null;
  }
}

/**
 * POST /api/admin/generate-image
 * Generates a product photo using Gemini Imagen with seamless AI fallback.
 * Admin-auth-gated. Returns { imageDataUrl } on success or { error } on failure.
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

  const { name_en, name_ta, category = "vegetable" } = body;
  if (!name_en?.trim()) {
    return NextResponse.json(
      { error: "name_en is required for image generation" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  let imageDataUrl: string | null = null;

  // 1. Try Gemini Imagen 3 if API Key is configured
  if (apiKey) {
    const categoryLabel = category === "fruit" ? "fruit" : category === "grocery" ? "grocery item" : "vegetable";
    const tamilHint = name_ta?.trim() ? ` (also known as "${name_ta.trim()}" in Tamil)` : "";
    const prompt = `A clean, well-lit product photo of fresh ${name_en.trim()}${tamilHint} on a plain white background. E-commerce style, top-down or 45-degree angle, no watermark, no text, photorealistic, high quality ${categoryLabel} produce photo.`;

    try {
      let res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      } else {
        // Try predict endpoint
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        }
      }
    } catch {
      // Fallthrough to AI fallback
    }
  }

  // 2. Seamless AI Fallback (works on free API keys when Imagen returns 404)
  if (!imageDataUrl) {
    imageDataUrl = await generateFallbackAIImage(name_en, category);
  }

  if (!imageDataUrl) {
    return NextResponse.json(
      { error: "Image generation failed. Please try again or upload a photo manually." },
      { status: 502 }
    );
  }

  return NextResponse.json({ imageDataUrl });
}
