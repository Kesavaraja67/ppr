"use client";

import { useState, useEffect, useRef } from "react";

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
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).hcaptcha.reset();
      } catch {
        // ignore if not rendered
      }
    }
    const container = document.getElementById(captchaRenderId);
    if (container) {
      container.removeAttribute("data-hcaptcha-widget-id");
      container.removeAttribute("data-hcaptcha-response");
      container.innerHTML = "";
    }
  } catch (err) {
    console.error("Error resetting MSG91 captcha:", err);
  }
}

export function useMsg91Widget(captchaRenderId: string) {
  const [ready, setReady] = useState<boolean>(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Reset the captcha container element on mount to ensure clean state
    resetMsg91Captcha(captchaRenderId);

    // Build configuration
    const configuration = {
      widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
      tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
      exposeMethods: true,
      captchaRenderId,
      success: () => { },
      failure: (err: unknown) => console.error("MSG91 widget error:", err),
    };

    const runInit = () => {
      try {
        // @ts-expect-error global exposed by the MSG91 otp-provider script
        window.initSendOTP(configuration);
        setReady(true);
      } catch (err) {
        console.warn("MSG91 initSendOTP safely caught:", err);
      }
    };

    // If script already loaded, re-initialize immediately
    if (typeof (window as WindowWithMSG91).initSendOTP === "function") {
      runInit();
      return;
    }

    // Guard against Strict Mode double-invocation during initial script load
    if (initialized.current) return;
    initialized.current = true;

    // Detect an existing script element
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SCRIPT_SRC}"]`
    );

    if (existing) {
      const prev = existing.onload;
      existing.onload = (ev) => {
        if (typeof prev === "function") prev.call(existing, ev);
        runInit();
      };
      return;
    }

    // First load
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      runInit();
    };
    document.body.appendChild(script);
  }, [captchaRenderId]);

  return { ready };
}
