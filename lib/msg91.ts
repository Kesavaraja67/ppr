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

export async function verifyMsg91AccessToken(
  accessToken: string
): Promise<{ success: true; phone: string } | { success: false; error: string }> {
  if (!MSG91_AUTH_KEY) {
    console.error("MSG91_AUTH_KEY is missing in environment variables.");
    return { success: false, error: "Server misconfiguration. Please try again later." };
  }

  try {
    const response = await fetch(
      "https://control.msg91.com/api/v5/widget/verifyAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authkey: MSG91_AUTH_KEY, "access-token": accessToken }),
      }
    );
    const data = await response.json();

    // Response shape: try documented field first, then plausible alternates.
    // If none match, log the raw payload so the correct field is immediately
    // visible in server logs on the first real test — fail loudly, not silently.
    const isSuccess = data.type === "success" || response.ok === true;
    const phoneCandidate =
      data.message ?? data.data?.mobile ?? data.mobile ?? data.identifier;

    if (isSuccess && phoneCandidate) {
      return { success: true, phone: String(phoneCandidate) };
    }

    if (isSuccess && !phoneCandidate) {
      console.error(
        "MSG91 verifyAccessToken: success but no recognizable phone field. Raw response:",
        JSON.stringify(data)
      );
      return {
        success: false,
        error: "Could not read verified phone number from MSG91 response",
      };
    }

    return { success: false, error: data.message || "Invalid or expired OTP session" };
  } catch (error) {
    console.error("MSG91 verifyAccessToken error:", error);
    return { success: false, error: "Network error verifying OTP session" };
  }
}
