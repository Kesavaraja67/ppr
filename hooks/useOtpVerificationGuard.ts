"use client";

import { useRef, useCallback } from "react";

/**
 * Shared hook to guard OTP sending and verification from duplicate or concurrent submissions.
 * Encapsulates the isVerifyingRef lock lifecycle to prevent drift across pages.
 */
export function useOtpVerificationGuard() {
  const isVerifyingRef = useRef(false);

  const startVerification = useCallback(() => {
    if (isVerifyingRef.current) return false;
    isVerifyingRef.current = true;
    return true;
  }, []);

  const resetVerification = useCallback(() => {
    isVerifyingRef.current = false;
  }, []);

  const isVerifying = useCallback(() => {
    return isVerifyingRef.current;
  }, []);

  return {
    isVerifyingRef,
    isVerifying,
    startVerification,
    resetVerification,
  };
}
