/**
 * Client-Side Firebase SDK Initialization
 * Handles Anonymous Authentication, RTDB client connections, and Emulator bindings
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getDatabase,
  Database,
  connectDatabaseEmulator,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project',
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://mock-project-default-rtdb.firebaseio.com',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Singleton Firebase App instance
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const rtdb: Database = getDatabase(app);

// Connect to local emulators if configured
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
) {
  const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
  const dbHost = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1';
  const dbPort = Number(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT || 9000);

  try {
    connectAuthEmulator(auth, authHost, { disableWarnings: true });
    connectDatabaseEmulator(rtdb, dbHost, dbPort);
  } catch {
    // Emulator connection might be already established in hot-reload
  }
}

/**
 * Ensures user is authenticated anonymously with persistent session.
 */
export async function ensureAnonymousAuth(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          unsubscribe();
          reject(err);
        }
      }
    });
  });
}
