import { describe, expect, it } from 'vitest';
import { acceptanceEnv } from '../helpers/acceptanceEnv';

const valid = () => ({ F08_ACCEPTANCE: 'emulator', FIREBASE_PROJECT_ID: 'demo-f08-fixture', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-f08-fixture',
  FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:19000', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:19099',
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true', NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: 'http://127.0.0.1:19099',
  NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1', NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT: '19000', NEXT_PUBLIC_FIREBASE_API_KEY: 'emulator-only',
  FIREBASE_DATABASE_URL: 'http://127.0.0.1:19000/?ns=demo-f08-fixture-default-rtdb',
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: 'http://127.0.0.1:19000/?ns=demo-f08-fixture-default-rtdb', PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3000' });
describe('F08 test-target guard', () => {
  it('accepts only the explicit loopback demo fixture', () => { expect(acceptanceEnv(valid()).project).toBe('demo-f08-fixture'); });
  it.each([
    { F08_ACCEPTANCE: undefined }, { FIREBASE_PROJECT_ID: 'production-project' }, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'another-project' },
    { FIREBASE_DATABASE_EMULATOR_HOST: 'remote.example:9000' }, { FIREBASE_AUTH_EMULATOR_HOST: '0.0.0.0:9099' },
    { FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:65536' }, { FIREBASE_DATABASE_URL: 'https://production.firebaseio.com' },
    { NEXT_PUBLIC_FIREBASE_DATABASE_URL: 'http://127.0.0.1:19000/?ns=shared' }, { PLAYWRIGHT_BASE_URL: 'https://app.vercel.app' },
    { PLAYWRIGHT_BASE_URL: 'http://secret@localhost:3000' },
    { NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'false' }, { NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: 'http://localhost:9099' },
    { NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT: '9000' }, { NEXT_PUBLIC_FIREBASE_API_KEY: 'live-key-placeholder' },
    { FIREBASE_PRIVATE_KEY: 'test-only-placeholder' },
  ])('rejects incompatible target %j before any SDK/network access', override => { expect(() => acceptanceEnv({ ...valid(), ...override })).toThrow(); });
});
