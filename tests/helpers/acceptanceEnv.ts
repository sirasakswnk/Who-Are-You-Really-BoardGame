/** No .env loading. Test writes target only an explicit local emulator. */
export function acceptanceEnv(env: Record<string, string | undefined> = process.env) {
  if (env.F08_ACCEPTANCE !== 'emulator') throw new Error('Use npm run verify:acceptance; F08 only runs on an isolated local emulator.');
  const project = env.FIREBASE_PROJECT_ID;
  if (!project || !/^demo-f08-[a-z0-9-]{1,60}$/.test(project) || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== project) throw new Error('F08 requires its own demo project.');
  const host = (value: string | undefined) => {
    if (!value || !/^(127\.0\.0\.1|localhost):\d+$/.test(value)) throw new Error('F08 requires loopback emulator hosts.');
    const port = Number(value.split(':')[1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid emulator port.');
    return value;
  };
  const databaseHost = host(env.FIREBASE_DATABASE_EMULATOR_HOST), authHost = host(env.FIREBASE_AUTH_EMULATOR_HOST);
  const [databaseHostname, databasePort] = databaseHost.split(':');
  if (env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true' || env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST !== `http://${authHost}` ||
      env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST !== databaseHostname || Number(env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT) !== Number(databasePort) ||
      env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'emulator-only' || env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_PRIVATE_KEY || env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('F08 requires matching client emulator configuration without live credentials.');
  }
  const databaseURL = new URL(env.FIREBASE_DATABASE_URL ?? '');
  if (databaseURL.protocol !== 'http:' || databaseURL.host !== databaseHost || !['', '/'].includes(databaseURL.pathname) ||
      databaseURL.username || databaseURL.password || databaseURL.hash ||
      databaseURL.search !== `?ns=${project}-default-rtdb` || env.NEXT_PUBLIC_FIREBASE_DATABASE_URL !== databaseURL.toString()) throw new Error('F08 database target mismatch.');
  const baseURL = new URL(env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000');
  if (baseURL.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseURL.hostname) || baseURL.username || baseURL.password ||
      baseURL.search || baseURL.hash || baseURL.pathname !== '/') throw new Error('F08 requires a local application.');
  return { project, databaseHost, authHost, databaseURL, baseURL };
}
