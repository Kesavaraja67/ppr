/**
 * MSG91 OTP Widget — server-side access-token verification.
 *
 * OTP send/verify happens client-side via the MSG91 Widget SDK
 * (window.sendOtp / window.verifyOtp in the browser). Once the widget
 * verifies the code it returns an access-token to the browser, which the
 * browser forwards to POST /api/auth/verify-otp. This endpoint confirms the
 * token against MSG91 before trusting the phone number and issuing a session.
 *
 * This uses MSG91's own default DLT-exempt OTP template — no DLT
 * registration required for this flow.
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";

/** Timeout (ms) for the MSG91 verifyAccessToken network call. */
const VERIFY_TIMEOUT_MS = 8_000;

export async function verifyMsg91AccessToken(
  accessToken: string
): Promise<{ success: true; phone: string } | { success: false; error: string }> {
  if (!MSG91_AUTH_KEY) {
    console.error("MSG91_AUTH_KEY is missing in environment variables.");
    return { success: false, error: "Server misconfiguration. Please try again later." };
  }

  // Abort the upstream call if MSG91 stalls.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://control.msg91.com/api/v5/widget/verifyAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authkey: MSG91_AUTH_KEY, "access-token": accessToken }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    const data = await response.json();

    // Require BOTH a 2xx status AND data.type === "success".
    // The OR condition previously allowed HTTP-200 error payloads to pass —
    // data.message could then be mistaken for a phone number.
    const isSuccess = response.ok && data?.type === "success";

    const phoneCandidate =
      data.message ?? data.data?.mobile ?? data.mobile ?? data.identifier;

    if (isSuccess && phoneCandidate) {
      return { success: true, phone: String(phoneCandidate) };
    }

    if (isSuccess && !phoneCandidate) {
      // Log response type only — never the full payload which may contain PII.
      console.error(
        "MSG91 verifyAccessToken: success but no recognizable phone field. " +
        `Response type: ${data?.type ?? "unknown"}`
      );
      return {
        success: false,
        error: "Could not read verified phone number from MSG91 response",
      };
    }

    return { success: false, error: data.message || "Invalid or expired OTP session" };
  } catch (error) {
    clearTimeout(timer);
    const isAbort = error instanceof Error && error.name === "AbortError";
    if (isAbort) {
      console.error("MSG91 verifyAccessToken: request timed out after", VERIFY_TIMEOUT_MS, "ms");
      return { success: false, error: "OTP verification timed out. Please try again." };
    }
    console.error("MSG91 verifyAccessToken error:", error);
    return { success: false, error: "Network error verifying OTP session" };
  }
}
