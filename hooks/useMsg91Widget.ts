"use client";

import { useState, useEffect } from "react";

const WIDGET_SCRIPT_SRC = "https://verify.msg91.com/otp-provider.js";

type WindowWithMSG91 = Window & typeof globalThis & { initSendOTP?: unknown };

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
 * Handles React Strict Mode (double-invoke) by detecting an already-pending
 * script element and awaiting its onload instead of appending a second one.
 *
 * @param captchaRenderId  ID of the hidden div the widget will mount into.
 */
export function resetMsg91Captcha(captchaRenderId: string) {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).hcaptcha && typeof (window as any).hcaptcha.reset === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).hcaptcha.reset();
    }
    const container = document.getElementById(captchaRenderId);
    if (container) {
      container.innerHTML = "";
    }
  } catch (err) {
    console.error("Error resetting MSG91 captcha:", err);
  }
}

export function useMsg91Widget(captchaRenderId: string) {
  // Lazy initialiser: if sendOtp or initSendOTP is already on window
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (window as any).sendOtp === "function" || typeof (window as WindowWithMSG91).initSendOTP === "function";
  });

  useEffect(() => {
    // If window.sendOtp is already initialized, do not re-initialize initSendOTP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).sendOtp === "function") {
      return;
    }

    // Build configuration once
    const configuration = {
      widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
      tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
      exposeMethods: true,
      captchaRenderId,
      success: () => {},
      failure: (err: unknown) => console.error("MSG91 widget error:", err),
    };

    if (typeof (window as WindowWithMSG91).initSendOTP === "function") {
      resetMsg91Captcha(captchaRenderId);
      // @ts-expect-error global exposed by the MSG91 otp-provider script
      window.initSendOTP(configuration);
      return;
    }

    // Detect an existing script element (Strict Mode double-invoke, or a
    // sibling component that already started loading the same script).
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SCRIPT_SRC}"]`
    );

    if (existing) {
      // Script is in the DOM but not yet loaded — piggyback on its onload.
      const prev = existing.onload;
      existing.onload = (ev) => {
        if (typeof prev === "function") prev.call(existing, ev);
        // @ts-expect-error global exposed by the MSG91 otp-provider script
        window.initSendOTP(configuration);
        setReady(true);
      };
      return;
    }

    // First load — append the script and initialise on load.
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_SRC;
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
