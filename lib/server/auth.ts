/**
 * Server Authentication Helper
 * Verifies Firebase ID Token from incoming HTTP Authorization header
 */

import { adminAuth, isAdminInitializedWithCredentials } from '../firebase/admin';

export interface AuthContext {
  uid: string;
}

/**
 * Extracts and verifies the Firebase ID token from Request headers.
 * Format: "Authorization: Bearer <idToken>"
 */
export async function verifyAuthToken(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return null;
  }

  // Support test tokens in unit test environments
  if (process.env.NODE_ENV === 'test' && token.startsWith('mock-token-')) {
    return { uid: token.replace('mock-token-', '') };
  }

  // Prevent metadata service lookup hang in Serverless (AWS/Vercel) if credentials missing or invalid
  if (
    !isAdminInitializedWithCredentials &&
    !process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    process.env.NODE_ENV !== 'test'
  ) {
    console.error('Firebase Admin credentials unavailable');
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    // SDK errors can embed the rejected token. Never log their payload.
    console.error('Failed to verify Firebase ID token');
    return null;
  }
}
