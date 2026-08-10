"use client";

import { useState, useEffect } from "react";

/** ms before declaring captcha system broken and surfacing an error */
const CAPTCHA_STUCK_MS = 10_000;
/** Poll interval when watching for captcha provider script / signal to appear */
const POLL_INTERVAL_MS = 200;

type CaptchaWindow = Window & {
  grecaptcha?: { ready: (cb: () => void) => void };
  hcaptcha?: unknown;
  sendOtp?: unknown;
};

export interface CaptchaReadyState {
  captchaReady: boolean;
  captchaError: string | null;
}

/**
 * Signals when the underlying reCAPTCHA/hCaptcha/MSG91 system is ready
 * to process sendOtp() calls — preventing the "first click fails" race.
 *
 * Strategy:
 *  1. Wait until MSG91's script is loaded (widgetReady must be true first).
 *  2. Check for verified provider signals:
 *     - window.grecaptcha.ready() callback
 *     - window.hcaptcha presence
 *     - window.sendOtp function registered by MSG91 SDK
 *  3. Only mark ready when a verified signal is detected.
 *  4. If no signal arrives within CAPTCHA_STUCK_MS, surface a clear error.
 *     Timeout expiration NEVER marks CAPTCHA ready by itself.
 */
export function useCaptchaReady(widgetReady: boolean): CaptchaReadyState {
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  useEffect(() => {
    if (!widgetReady) return;

    let settled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let stuckTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      if (settled) return;
      settled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (stuckTimer) clearTimeout(stuckTimer);
      setCaptchaReady(true);
      setCaptchaError(null);
    };

    const failStuck = () => {
      if (settled) return;
      settled = true;
      if (pollInterval) clearInterval(pollInterval);
      setCaptchaError(
        "Verification system unavailable. Please refresh the page and try again."
      );
    };

    // Stuck-captcha guard — surface error if no verified provider signal arrives
    stuckTimer = setTimeout(failStuck, CAPTCHA_STUCK_MS);

    const checkProviderReady = (): boolean => {
      const win = window as CaptchaWindow;
      // Signal 1: Google reCAPTCHA ready callback
      if (win.grecaptcha && typeof win.grecaptcha.ready === "function") {
        win.grecaptcha.ready(settle);
        return true;
      }
      // Signal 2: hCaptcha global object or MSG91 sendOtp method loaded
      if (win.hcaptcha || typeof win.sendOtp === "function") {
        settle();
        return true;
      }
      return false;
    };

    // Fast-path: provider already ready
    if (checkProviderReady()) {
      return () => {
        if (stuckTimer) clearTimeout(stuckTimer);
      };
    }

    // Slow-path: poll until provider signal is verified
    pollInterval = setInterval(() => {
      if (checkProviderReady()) {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
      }
    }, POLL_INTERVAL_MS);

    return () => {
      settled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (stuckTimer) clearTimeout(stuckTimer);
    };
  }, [widgetReady]);

  return { captchaReady, captchaError };
}
