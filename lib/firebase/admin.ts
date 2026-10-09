/**
 * Server-Side Firebase Admin SDK Initialization
 * Used exclusively by Next.js Route Handlers to verify ID tokens and perform atomic RTDB transactions
 */

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getDatabase, Database } from 'firebase-admin/database';

let app: App;

export function normalizePrivateKey(rawKey: string | undefined): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();
  // Strip surrounding double or single quotes if copied with quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  // Replace literal '\n' string with real newlines
  key = key.replace(/\\n/g, '\n');
  // Normalize Windows \r\n to \n
  key = key.replace(/\r\n/g, '\n');
  return key;
}

if (getApps().length === 0) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'mock-project';
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://mock-project-default-rtdb.firebaseio.com';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (clientEmail && privateKey) {
    try {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });
    } catch (certErr) {
      console.error('Failed to initialize Firebase Admin with cert:', certErr);
      app = initializeApp({
        projectId,
        databaseURL,
      });
    }
  } else {
    app = initializeApp({
      projectId,
      databaseURL,
    });
  }
} else {
  app = getApps()[0];
}

export const adminAuth: Auth = getAuth(app);
export const adminDb: Database = getDatabase(app);
