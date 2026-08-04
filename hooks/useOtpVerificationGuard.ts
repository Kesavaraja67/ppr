"use client";

import { useRef, useCallback } from "react";

/**
 * Shared hook to guard OTP sending and verification from duplicate or concurrent submissions.
 * Encapsulates the isVerifyingRef lock lifecycle to prevent drift across pages.
 */
export function useOtpVerificationGuard() {
  const isVerifyingRef = useRef(false);
  const attemptIdRef = useRef<number>(0);

  const startVerification = useCallback(() => {
    if (isVerifyingRef.current) return 0;
    isVerifyingRef.current = true;
    attemptIdRef.current += 1;
    return attemptIdRef.current;
  }, []);

  const resetVerification = useCallback((id?: number) => {
    if (id !== undefined && id !== attemptIdRef.current) return;
    isVerifyingRef.current = false;
  }, []);

  const isValidAttempt = useCallback((id: number) => {
    return isVerifyingRef.current && id === attemptIdRef.current;
  }, []);

  const isVerifying = useCallback(() => {
    return isVerifyingRef.current;
  }, []);

  return {
    isVerifyingRef,
    isVerifying,
    startVerification,
    resetVerification,
    isValidAttempt,
  };
}
