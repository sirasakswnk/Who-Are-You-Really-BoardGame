/**
 * Server-Side Firebase Admin SDK Initialization
 * Used exclusively by Next.js Route Handlers to verify ID tokens and perform atomic RTDB transactions
 */

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getDatabase, Database } from 'firebase-admin/database';

let app: App;

if (getApps().length === 0) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'mock-project';
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://mock-project-default-rtdb.firebaseio.com';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL,
    });
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
