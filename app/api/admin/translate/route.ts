import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * POST /api/admin/translate
 * Translates a produce name between English and Tamil using Gemini Flash.
 * Admin-auth-gated. Fails silently (returns { translation: null }) if the
 * key is missing or the API call fails — never blocks item creation.
 */
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ translation: null });
  }

  let body: { text?: string; from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ translation: null });
  }

  const { text, from, to } = body;
  if (!text?.trim() || !from || !to) {
    return NextResponse.json({ translation: null });
  }

  // Only support the two validated codes — reject anything else.
  const SUPPORTED = new Set(["en", "ta"]);
  if (!SUPPORTED.has(from) || !SUPPORTED.has(to) || from === to) {
    return NextResponse.json({ translation: null });
  }

  const langName = (code: "en" | "ta") => (code === "en" ? "English" : "Tamil");

  const prompt = `You are a translation assistant for a grocery produce shop in Tamil Nadu, India.
Translate the following food/produce name from ${langName(from as "en" | "ta")} to ${langName(to as "en" | "ta")}.
Return ONLY the translated name — no explanation, no punctuation, no alternatives.

Input: ${text.trim()}
Translation:`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 64 },
        }),
        signal: AbortSignal.timeout(8_000), // 8 s hard ceiling
      }
    );

    if (!res.ok) {
      return NextResponse.json({ translation: null });
    }

    const data = await res.json();
    const translation: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translation) {
      return NextResponse.json({ translation: null });
    }

    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json({ translation: null });
  }
}
