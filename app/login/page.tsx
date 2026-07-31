"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/";

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otpInputRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Clean up the RecaptchaVerifier when the component unmounts
  useEffect(() => {
    return () => {
      recaptchaVerifierRef.current?.clear();
    };
  }, []);

  const handleSendOtp = async () => {
    const raw = phone.replace(/\D/g, "");
    const cleaned = raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : raw;
    if (cleaned.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // ── Step 1: Server-side rate-limit pre-flight ─────────────────────────
      const rateRes = await fetch("/api/auth/check-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });

      if (!rateRes.ok) {
        const rateData = await rateRes.json();
        setError(rateData.error ?? "Too many requests. Please try again later.");
        return;
      }

      // ── Step 2: Initialise invisible reCAPTCHA (once per session) ─────────
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          getFirebaseAuth(),
          "recaptcha-container",
          { size: "invisible" }
        );
      }

      // ── Step 3: Trigger SMS via Firebase client SDK ───────────────────────
      const phoneNumber = `+91${cleaned}`;
      const confirmationResult = await signInWithPhoneNumber(
        getFirebaseAuth(),
        phoneNumber,
        recaptchaVerifierRef.current
      );

      confirmationRef.current = confirmationResult;

      setStep("otp");
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err: unknown) {
      console.error("Firebase signInWithPhoneNumber error:", err);
      const firebaseErr = err as { code?: string; message?: string };
      // Reset verifier so reCAPTCHA can be re-rendered on retry
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;

      if (firebaseErr.code === "auth/too-many-requests") {
        setError("Too many OTP requests. Please wait a few minutes before trying again.");
      } else if (firebaseErr.code === "auth/invalid-phone-number") {
        setError("Invalid phone number. Please check and try again.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const code = otpCode ?? otp;
    if (!code || code.length < 4) {
      setError("Enter the OTP sent to your phone");
      return;
    }

    if (!confirmationRef.current) {
      setError("Session expired. Please request a new OTP.");
      setStep("phone");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // ── Step 4: Confirm OTP client-side → get Firebase ID token ──────────
      const userCredential = await confirmationRef.current.confirm(code);
      const idToken = await userCredential.user.getIdToken();

      const raw = phone.replace(/\D/g, "");
      const cleaned = raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : raw;

      // ── Step 5: Server verifies ID token → issues session cookie ─────────
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Verification failed. Please try again.");
        return;
      }

      router.replace(nextUrl);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (
        firebaseErr.code === "auth/invalid-verification-code" ||
        firebaseErr.code === "auth/code-expired"
      ) {
        setError("Incorrect or expired OTP. Please try again.");
      } else {
        console.error("OTP confirm error:", err);
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // WebOTP API — Android Chrome auto-fill
  useEffect(() => {
    if (step !== "otp") return;
    if (!("credentials" in navigator)) return;

    const controller = new AbortController();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator.credentials as any)
      .get({ otp: { transport: ["sms"] }, signal: controller.signal })
      .then((credential: { code: string }) => {
        if (credential?.code) {
          setOtp(credential.code);
          handleVerifyOtp(credential.code);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const cleanedPhone = phone.replace(/\D/g, "").replace(/^91/, "");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Emerald top bar */}
      <div
        style={{
          background: "linear-gradient(150deg, #1A6B47 0%, #1F8456 60%, #2A9C6A 100%)",
          padding: "52px 20px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-40px",
            right: "-24px",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-20px",
            right: "48px",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        {/* Back link */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "0.82rem",
            fontFamily: "var(--font)",
            fontWeight: 500,
            marginBottom: "28px",
            position: "relative",
            zIndex: 1,
          }}
        >
          &#8592; Back to catalog
        </Link>

        {/* Branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="P.P.R. Fruits & Vegetables Logo"
            style={{
              height: "52px",
              width: "auto",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
              borderRadius: "50%",
            }}
          />
          <p
            style={{
              color: "#fff",
              fontSize: "0.88rem",
              fontFamily: "var(--font)",
              fontWeight: 700,
            }}
          >
            P.P.R. Fruits &amp; Vegetables
          </p>
        </div>

        {/* Step title */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            style={{
              color: "#fff",
              fontSize: "1.65rem",
              fontFamily: "var(--font)",
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: "6px",
            }}
          >
            {step === "phone" ? (
              <>Sign in to<br />your account</>
            ) : (
              <>Enter the<br />OTP code</>
            )}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.82rem",
              fontFamily: "var(--font)",
              fontWeight: 400,
            }}
          >
            {step === "phone"
              ? "We'll send a one-time password to verify your number."
              : `Code sent to +91 ${cleanedPhone}`}
          </p>
        </div>
      </div>

      {/* Form card */}
      <div
        style={{
          flex: 1,
          padding: "28px 20px 32px",
          position: "relative",
          marginTop: "-16px",
          background: "var(--bg)",
          borderRadius: "20px 20px 0 0",
        }}
      >
        {step === "phone" ? (
          <div>
            <p
              style={{
                fontSize: "0.78rem",
                fontFamily: "var(--font)",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Mobile Number
            </p>
            <div
              style={{
                display: "flex",
                border: "1.5px solid var(--border)",
                borderRadius: "14px",
                overflow: "hidden",
                marginBottom: "20px",
                background: "#fff",
                boxShadow: "var(--shadow-card)",
                transition: "border-color 160ms",
              }}
            >
              <span
                style={{
                  padding: "14px 16px",
                  background: "var(--emerald-light, #E6F4EE)",
                  color: "var(--emerald, #1A6B47)",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font)",
                  fontWeight: 700,
                  borderRight: "1.5px solid var(--border, #F0F0F0)",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                +91
              </span>
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "14px 16px",
                  fontSize: "1rem",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "var(--font)",
                  color: "var(--text-primary)",
                  letterSpacing: "0.05em",
                }}
                maxLength={10}
                autoFocus
              />
            </div>

            {error && (
              <div
                style={{
                  background: "var(--error-light)",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "0.75rem", flexShrink: 0 }}>!</span>
                <p
                  style={{
                    color: "var(--error)",
                    fontSize: "0.82rem",
                    fontFamily: "var(--font)",
                    fontWeight: 500,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            <button
              className="btn-accent"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Sending OTP…" : "Send OTP →"}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font)",
                marginTop: "16px",
                lineHeight: 1.5,
              }}
            >
              By continuing, you agree to receive an OTP via SMS.
              <br />
              Standard message rates may apply.
            </p>
          </div>
        ) : (
          <div>
            <p
              style={{
                fontSize: "0.78rem",
                fontFamily: "var(--font)",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              One-Time Password
            </p>
            <input
              id="otp-input"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              style={{
                width: "100%",
                padding: "18px 20px",
                border: "1.5px solid var(--border)",
                borderRadius: "14px",
                fontSize: "2rem",
                letterSpacing: "0.4em",
                textAlign: "center",
                outline: "none",
                fontFamily: "var(--font)",
                fontWeight: 700,
                color: "var(--text-primary)",
                background: "#fff",
                boxShadow: "var(--shadow-card)",
                marginBottom: "20px",
                transition: "border-color 160ms, box-shadow 160ms",
              }}
              maxLength={8}
            />

            {error && (
              <div
                style={{
                  background: "var(--error-light)",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "0.75rem", flexShrink: 0 }}>!</span>
                <p
                  style={{
                    color: "var(--error)",
                    fontSize: "0.82rem",
                    fontFamily: "var(--font)",
                    fontWeight: 500,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            <button
              className="btn-accent"
              style={{ width: "100%", justifyContent: "center", marginBottom: "12px" }}
              onClick={() => handleVerifyOtp()}
              disabled={loading}
            >
              {loading ? "Verifying…" : "Confirm OTP →"}
            </button>

            <button
              style={{
                width: "100%",
                padding: "14px",
                background: "none",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.88rem",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontFamily: "var(--font)",
                fontWeight: 500,
                transition: "border-color 160ms, color 160ms",
              }}
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
                confirmationRef.current = null;
                // Clear verifier so a fresh reCAPTCHA renders on next send
                recaptchaVerifierRef.current?.clear();
                recaptchaVerifierRef.current = null;
              }}
            >
              ← Change phone number
            </button>
          </div>
        )}
      </div>

      {/*
        Invisible reCAPTCHA mount point — Firebase attaches its widget here.
        Must NOT be display:none — use visually-hidden instead so the DOM
        element is properly rendered when RecaptchaVerifier initialises.
      */}
      <div
        id="recaptcha-container"
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontFamily: "var(--font)",
            fontSize: "0.88rem",
          }}
        >
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
