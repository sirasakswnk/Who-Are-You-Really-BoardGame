/**
 * Server Authentication Helper
 * Verifies Firebase ID Token from incoming HTTP Authorization header
 */

import { adminAuth } from '../firebase/admin';

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

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch (err) {
    console.error('Failed to verify Firebase ID token:', err);
    return null;
  }
}
