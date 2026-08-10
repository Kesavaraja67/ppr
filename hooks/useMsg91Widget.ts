"use client";

import { useState, useEffect, useRef } from "react";

const WIDGET_SCRIPT_SRC = "https://verify.msg91.com/otp-provider.js";

type WindowWithMSG91 = Window & typeof globalThis & { initSendOTP?: unknown };

/**
 * Reset MSG91 captcha DOM elements and hcaptcha instance if present.
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
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (window as any).sendOtp === "function";
  });
  const [widgetError, setWidgetError] = useState<string | null>(null);
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
      failure: (err: unknown) => {
        console.error("MSG91 widget error:", err);
        setWidgetError("Failed to initialize OTP service. Please refresh.");
      },
    };

    const runInit = () => {
      try {
        // @ts-expect-error global exposed by the MSG91 otp-provider script
        window.initSendOTP(configuration);
        setReady(true);
        setWidgetError(null);
      } catch (err) {
        console.warn("MSG91 initSendOTP caught error:", err);
        setWidgetError("Failed to start OTP service. Please refresh and try again.");
      }
    };

    // If script already loaded, check if sendOtp is already bound to avoid duplicate init
    if (typeof (window as WindowWithMSG91).initSendOTP === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (window as any).sendOtp === "function") {
        return;
      }
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
      existing.onerror = () => {
        setWidgetError("Failed to load OTP service script.");
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
    script.onerror = () => {
      setWidgetError("Failed to load OTP service script.");
    };
    document.body.appendChild(script);
  }, [captchaRenderId]);

  return { ready, widgetError };
}
