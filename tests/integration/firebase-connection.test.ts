import { describe, it, expect, beforeAll } from 'vitest';
import { loadEnvConfig } from '@next/env';

// Load .env and .env.local
beforeAll(() => {
  loadEnvConfig(process.cwd());
});

describe('Firebase Real Connection & Credentials Verification', () => {
  it('has all required environment variables set', () => {
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
    const { getAuth, signInAnonymously } = await import('firebase/auth');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const clientApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const clientAuth = getAuth(clientApp);

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
    if (getAdminApps().length === 0) {
      adminApp = initAdminApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
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
    if (getAdminApps().length === 0) {
      adminApp = initAdminApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
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
