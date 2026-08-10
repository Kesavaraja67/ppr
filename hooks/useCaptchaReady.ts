"use client";

import { useState, useEffect } from "react";

/** ms before giving up on grecaptcha and assuming captcha is ready (invisible mode) */
const CAPTCHA_GRACE_MS = 3_000;
/** ms before declaring captcha system broken and surfacing an error */
const CAPTCHA_STUCK_MS = 10_000;
/** Poll interval when watching for window.grecaptcha to appear */
const POLL_INTERVAL_MS = 200;

type GrecaptchaWindow = Window & {
  grecaptcha?: { ready: (cb: () => void) => void };
};

export interface CaptchaReadyState {
  captchaReady: boolean;
  captchaError: string | null;
}

/**
 * Signals when the underlying reCAPTCHA/hCaptcha system used by MSG91 is ready
 * to process sendOtp() calls — preventing the "first click fails" race.
 *
 * Strategy:
 *  1. Wait until MSG91's script is loaded (widgetReady must be true first).
 *  2. Try window.grecaptcha.ready() — fires when Google reCAPTCHA has fully loaded.
 *  3. If grecaptcha never appears within CAPTCHA_GRACE_MS, assume MSG91 is running
 *     in invisible/no-challenge mode and declare ready anyway.
 *  4. If nothing resolves within CAPTCHA_STUCK_MS, surface a clear error so the
 *     user sees a message rather than a permanently disabled button.
 *
 * @param widgetReady true once MSG91's otp-provider.js script has loaded and
 *                    initSendOTP has been called (from useMsg91Widget / Msg91WidgetProvider).
 */
export function useCaptchaReady(widgetReady: boolean): CaptchaReadyState {
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  useEffect(() => {
    // Don't start until the MSG91 widget script itself is loaded.
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
    };

    const failStuck = () => {
      if (settled) return;
      settled = true;
      if (pollInterval) clearInterval(pollInterval);
      setCaptchaError(
        "Verification system unavailable. Please refresh the page and try again."
      );
    };

    // Stuck-captcha guard — never leave the button permanently disabled.
    stuckTimer = setTimeout(failStuck, CAPTCHA_STUCK_MS);

    const tryGrecaptcha = (): boolean => {
      const win = window as GrecaptchaWindow;
      if (win.grecaptcha && typeof win.grecaptcha.ready === "function") {
        win.grecaptcha.ready(settle);
        return true;
      }
      return false;
    };

    // Fast-path: grecaptcha already loaded (e.g. second visit, script cached).
    if (tryGrecaptcha()) {
      return () => {
        if (stuckTimer) clearTimeout(stuckTimer);
      };
    }

    // Slow-path: poll until grecaptcha appears or grace period elapses.
    let elapsed = 0;
    pollInterval = setInterval(() => {
      elapsed += POLL_INTERVAL_MS;

      if (tryGrecaptcha()) {
        // grecaptcha found — settle via its ready callback (clears interval inside settle).
        clearInterval(pollInterval!);
        pollInterval = null;
        return;
      }

      if (elapsed >= CAPTCHA_GRACE_MS) {
        // Grace period elapsed — MSG91 is likely in invisible/no-challenge mode.
        clearInterval(pollInterval!);
        pollInterval = null;
        settle();
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
