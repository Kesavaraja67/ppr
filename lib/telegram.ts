/**
 * Telegram order notifications — best-effort, non-blocking, never breaks checkout.
 *
 * Sends a message to the shop's Telegram chat whenever a new order is placed.
 * This is entirely additive: if TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not
 * configured, or the Telegram API call fails or times out, this silently no-ops.
 * It must NEVER throw — a notification failure must never fail, delay, or roll
 * back an order.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/** Timeout (ms) for the Telegram sendMessage call — matches lib/msg91.ts's pattern. */
const NOTIFY_TIMEOUT_MS = 5_000;

let warnedMissingConfig = false;

/**
 * Fire-and-forget order notification. Always resolves, never rejects.
 * Safe to `await` directly in a request handler without try/catch at the call site.
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    if (!warnedMissingConfig) {
      console.warn(
        "[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — order notifications disabled."
      );
      warnedMissingConfig = true;
    }
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("[telegram] sendMessage failed:", response.status, errBody);
    }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    if (isAbort) {
      console.error("[telegram] sendMessage timed out after", NOTIFY_TIMEOUT_MS, "ms");
    } else {
      console.error("[telegram] sendMessage error:", error);
    }
  } finally {
    clearTimeout(timer);
  }
  // Intentionally no throw on any path above — caller never needs try/catch.
}
