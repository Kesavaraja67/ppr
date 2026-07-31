/**
 * Firebase Admin SDK — server-only singleton.
 *
 * Exports `getAdminAuth()` for verifying Firebase ID tokens issued by the
 * client-side Phone Auth flow.
 *
 * Required env vars (server-only — never expose to browser):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL   — from the service account JSON
 *   FIREBASE_PRIVATE_KEY    — from the service account JSON
 *
 * Obtain by: Firebase Console → Project Settings → Service accounts →
 *            Generate new private key.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function formatPrivateKey(key: string): string {
  // Strip wrapping quotes if user pasted quotes into Vercel UI
  let cleaned = key.trim().replace(/^["']|["']$/g, "");
  // Convert literal '\n' characters into real newlines if present
  if (cleaned.includes("\\n")) {
    cleaned = cleaned.replace(/\\n/g, "\n");
  }
  return cleaned;
}

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    console.error(
      "Missing Firebase Admin env vars:",
      { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!rawPrivateKey }
    );
    throw new Error(
      "Firebase Admin SDK: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and " +
        "FIREBASE_PRIVATE_KEY must all be set in Vercel Environment Variables."
    );
  }

  const privateKey = formatPrivateKey(rawPrivateKey);

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let _adminAuth: Auth | null = null;

/** Returns the singleton Admin Auth instance, initialising it on first call. */
export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdminApp());
  }
  return _adminAuth;
}
