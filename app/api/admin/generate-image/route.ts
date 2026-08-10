import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * POST /api/admin/generate-image
 * Generates a product photo using Gemini Imagen.
 * Admin-auth-gated. Returns { imageDataUrl } on success or { error, configured } on failure.
 *
 * The imageDataUrl is a base64-encoded PNG data URL ready to drop into imageData state.
 */
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Image generation not configured", configured: false },
      { status: 503 }
    );
  }

  let body: { name_en?: string; name_ta?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name_en, name_ta, category } = body;
  if (!name_en?.trim()) {
    return NextResponse.json(
      { error: "name_en is required for image generation" },
      { status: 400 }
    );
  }

  const categoryLabel = category === "fruit" ? "fruit" : category === "grocery" ? "grocery item" : "vegetable";
  const tamilHint = name_ta?.trim() ? ` (also known as "${name_ta.trim()}" in Tamil)` : "";
  const prompt = `A clean, well-lit product photo of fresh ${name_en.trim()}${tamilHint} on a plain white background. E-commerce style, top-down or 45-degree angle, no watermark, no text, photorealistic, high quality ${categoryLabel} produce photo.`;

  try {
    const res = await fetch(
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
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      console.error("[generate-image] Imagen API error:", res.status, errText);
      return NextResponse.json(
        { error: "Image generation failed. Please try again or upload a photo manually." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const base64Image: string | undefined =
      data?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      return NextResponse.json(
        { error: "No image returned from generation API." },
        { status: 502 }
      );
    }

    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    return NextResponse.json({ imageDataUrl });
  } catch (err) {
    console.error("[generate-image] Unexpected error:", err);
    return NextResponse.json(
      { error: "Image generation failed unexpectedly." },
      { status: 500 }
    );
  }
}
