"use client";

import { useState, useEffect } from "react";

/**
 * Loads the MSG91 OTP Widget script once and tracks readiness.
 *
 * Usage:
 *   const { ready } = useMsg91Widget("msg91-captcha");
 *
 * The hook appends the otp-provider.js script to the document body and calls
 * window.initSendOTP with the provided captchaRenderId. `ready` becomes true
 * once initSendOTP has been called. On unmount the hook does NOT remove the
 * script — the widget registers global state that must persist across renders.
 *
 * @param captchaRenderId  ID of the hidden div the widget will mount into.
 */
export function useMsg91Widget(captchaRenderId: string) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If the script is already in the DOM (e.g. navigating back), init immediately.
    if (typeof window !== "undefined" && typeof (window as Window & typeof globalThis & { initSendOTP?: unknown }).initSendOTP === "function") {
      const configuration = {
        widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
        tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
        exposeMethods: true,
        captchaRenderId,
        success: () => {},
        failure: (err: unknown) => console.error("MSG91 widget error:", err),
      };
      // @ts-expect-error global exposed by the MSG91 otp-provider script
      window.initSendOTP(configuration);
      setReady(true);
      return;
    }

    const configuration = {
      widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
      tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
      exposeMethods: true,
      captchaRenderId,
      success: () => {},
      failure: (err: unknown) => console.error("MSG91 widget error:", err),
    };

    const script = document.createElement("script");
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error global exposed by the MSG91 otp-provider script
      window.initSendOTP(configuration);
      setReady(true);
    };
    document.body.appendChild(script);

    // NOTE: We intentionally do NOT remove the script on cleanup.
    // The MSG91 widget registers globals (window.sendOtp, window.verifyOtp)
    // that must remain available across React re-renders and Suspense boundaries.
    // Removing the script node would leave stale globals that throw on next call.
  }, [captchaRenderId]);

  return { ready };
}
