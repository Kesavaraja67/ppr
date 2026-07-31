/**
 * Firebase Admin SDK — server-only singleton.
 *
 * Exports `adminAuth` for verifying Firebase ID tokens issued by the
 * client-side Phone Auth flow.
 *
 * Required env vars (server-only — never expose to browser):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL   — from the service account JSON
 *   FIREBASE_PRIVATE_KEY    — from the service account JSON (keep \n escapes)
 *
 * Obtain by: Firebase Console → Project Settings → Service accounts →
 *            Generate new private key.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // The private key is stored with literal \n in .env — replace with real newlines
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and " +
        "FIREBASE_PRIVATE_KEY must all be set in the environment."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminAuth: Auth = getAuth(getAdminApp());
