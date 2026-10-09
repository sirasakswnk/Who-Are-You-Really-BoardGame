import { NextResponse } from 'next/server';
import { isAdminInitializedWithCredentials, adminInitError } from '@/lib/firebase/admin';

export async function GET() {
  const envCheck = {
    FIREBASE_PROJECT_ID: Boolean(
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ),
    NEXT_PUBLIC_FIREBASE_API_KEY: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: Boolean(
      process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    ),
    FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
    adminCredentialsReady: isAdminInitializedWithCredentials,
    adminInitError: adminInitError || null,
  };

  const isHealthy =
    envCheck.NEXT_PUBLIC_FIREBASE_API_KEY &&
    envCheck.FIREBASE_CLIENT_EMAIL &&
    envCheck.FIREBASE_PRIVATE_KEY &&
    isAdminInitializedWithCredentials;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      environment: envCheck,
      timestamp: new Date().toISOString(),
      note: isHealthy
        ? 'Firebase Admin and Client are fully configured!'
        : 'Please configure missing environment variables in Vercel Project Settings.',
    },
    {
      status: isHealthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
