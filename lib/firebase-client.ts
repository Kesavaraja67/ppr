/**
 * Firebase Client SDK — browser-safe singleton.
 *
 * Exports `auth` for use in client components (RecaptchaVerifier,
 * signInWithPhoneNumber, etc.).
 *
 * Env vars (must have NEXT_PUBLIC_ prefix to reach the browser):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *
 * The singleton is initialised lazily via `getFirebaseAuth()` so it is
 * never called during SSR (only "use client" components import this file,
 * but lazy init is an extra safety net).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

/** Returns the singleton Firebase Auth instance, initialising it on first call. */
export function getFirebaseAuth(): Auth {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!_auth) {
    _auth = getAuth(_app);
  }
  return _auth;
}

// Convenience re-export for callers that simply `import { auth }`.
// This eagerly resolves the singleton — only safe inside "use client" modules.
export const auth: Auth = (() => {
  if (typeof window === "undefined") {
    // SSR guard — return a stub; this branch is never reached in practice
    // because only client components import this file.
    return {} as Auth;
  }
  return getFirebaseAuth();
})();
