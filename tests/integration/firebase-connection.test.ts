import { describe, it, expect, beforeAll } from 'vitest';
import { loadEnvConfig } from '@next/env';

// Load .env and .env.local
beforeAll(() => {
  loadEnvConfig(process.cwd());
});

describe('Firebase Real Connection & Credentials Verification', () => {
  const isEmulator = Boolean(
    process.env.FIREBASE_DATABASE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );

  it('has all required environment variables set', () => {
    if (isEmulator) {
      expect(process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeTruthy();
      expect(process.env.FIREBASE_DATABASE_EMULATOR_HOST).toBeTruthy();
      return;
    }

    const requiredEnv = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_DATABASE_URL',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
    ];

    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error('Missing environment variables in .env:', missing);
    }
    expect(missing).toEqual([]);
  });

  it('connects to Firebase Client SDK and performs Anonymous Sign-in', async () => {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth, signInAnonymously, connectAuthEmulator } = await import('firebase/auth');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock-project.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'mock-project',
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'http://127.0.0.1:9000?ns=mock-project-default-rtdb',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
    };

    const clientApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const clientAuth = getAuth(clientApp);

    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      try {
        connectAuthEmulator(clientAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
      } catch {
        // already connected
      }
    }

    const userCredential = await signInAnonymously(clientAuth);
    expect(userCredential.user).toBeDefined();
    expect(userCredential.user.uid).toBeTruthy();
    expect(userCredential.user.isAnonymous).toBe(true);

    const idToken = await userCredential.user.getIdToken();
    expect(idToken).toBeTruthy();

    // Verify token with Firebase Admin SDK
    const { getApps: getAdminApps, initializeApp: initAdminApp, cert } = await import('firebase-admin/app');
    const { getAuth: getAdminAuth } = await import('firebase-admin/auth');

    let adminApp;
    const hasAdminCert = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
    if (getAdminApps().length === 0) {
      if (hasAdminCert) {
        adminApp = initAdminApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
      } else {
        adminApp = initAdminApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'mock-project',
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'http://127.0.0.1:9000?ns=mock-project-default-rtdb',
        });
      }
    } else {
      adminApp = getAdminApps()[0];
    }

    const adminAuth = getAdminAuth(adminApp);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    expect(decodedToken.uid).toBe(userCredential.user.uid);
  }, 15000);

  it('connects to Firebase Realtime Database via Admin SDK (write, read, remove)', async () => {
    const { getApps: getAdminApps, initializeApp: initAdminApp, cert } = await import('firebase-admin/app');
    const { getDatabase } = await import('firebase-admin/database');

    let adminApp;
    const hasAdminCert = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
    if (getAdminApps().length === 0) {
      if (hasAdminCert) {
        adminApp = initAdminApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
      } else {
        adminApp = initAdminApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'mock-project',
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'http://127.0.0.1:9000?ns=mock-project-default-rtdb',
        });
      }
    } else {
      adminApp = getAdminApps()[0];
    }

    const adminDb = getDatabase(adminApp);
    const testRef = adminDb.ref('_health_check/ping');

    // 1. Write ping
    const testPayload = { timestamp: Date.now(), message: 'Firebase RTDB Connection Successful!' };
    await testRef.set(testPayload);

    // 2. Read back
    const snap = await testRef.get();
    expect(snap.exists()).toBe(true);
    expect(snap.val()).toEqual(testPayload);

    // 3. Clean up
    await testRef.remove();
    const deletedSnap = await testRef.get();
    expect(deletedSnap.exists()).toBe(false);
  }, 15000);
});
