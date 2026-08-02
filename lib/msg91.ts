/**
 * MSG91 SendOTP API helper library.
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "";

export async function sendMsg91Otp(phone10Digit: string): Promise<{ success: boolean; error?: string }> {
  // Test number 9999999999 bypass
  if (phone10Digit === "9999999999") {
    return { success: true };
  }

  if (!MSG91_AUTH_KEY) {
    console.warn("MSG91_AUTH_KEY is missing in environment variables. Permitting test OTP mode.");
    return { success: true };
  }

  const mobile = `91${phone10Digit}`;
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.append("mobile", mobile);
  if (MSG91_TEMPLATE_ID) {
    url.searchParams.append("template_id", MSG91_TEMPLATE_ID);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        authkey: MSG91_AUTH_KEY,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.type === "success" || response.ok) {
      return { success: true };
    }

    return {
      success: false,
      error: data.message || "Failed to send OTP via MSG91. Please try again.",
    };
  } catch (error) {
    console.error("MSG91 Send OTP Error:", error);
    return {
      success: false,
      error: "Network error sending OTP. Please check your connection.",
    };
  }
}

export async function verifyMsg91Otp(phone10Digit: string, otp: string): Promise<{ success: boolean; error?: string }> {
  // Test number bypass
  if (phone10Digit === "9999999999" && otp === "654321") {
    return { success: true };
  }

  if (!MSG91_AUTH_KEY) {
    if (otp === "654321") return { success: true };
    return { success: false, error: "Invalid OTP code" };
  }

  const mobile = `91${phone10Digit}`;
  const url = new URL("https://control.msg91.com/api/v5/otp/verify");
  url.searchParams.append("mobile", mobile);
  url.searchParams.append("otp", otp);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        authkey: MSG91_AUTH_KEY,
      },
    });

    const data = await response.json();
    if (data.type === "success" || data.message === "OTP verified success") {
      return { success: true };
    }

    return {
      success: false,
      error: data.message || "Invalid or expired OTP code.",
    };
  } catch (error) {
    console.error("MSG91 Verify OTP Error:", error);
    return {
      success: false,
      error: "Network error verifying OTP. Please try again.",
    };
  }
}
