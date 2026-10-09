import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { delimiter } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const mode = process.argv[2] ?? '--all';
if (process.argv.length > 3 || !['--all', '--unit', '--list'].includes(mode)) {
  console.error('Use verify:acceptance with --all (default), --unit, or --list.'); process.exit(1);
}
const project = `demo-f08-${randomUUID()}`;
const databaseURL = `http://127.0.0.1:19000/?ns=${project}-default-rtdb`;
const env = { ...process.env, NODE_ENV: 'test', F08_ACCEPTANCE: 'emulator', F08_STAGE: mode,
  FIREBASE_PROJECT_ID: project, NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
  FIREBASE_DATABASE_URL: databaseURL, NEXT_PUBLIC_FIREBASE_DATABASE_URL: databaseURL,
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:19099', FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:19000',
  F02_RTDB_EMULATOR_HOST: '127.0.0.1:19000', F05_RTDB_EMULATOR_HOST: '127.0.0.1:19000',
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true', NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: 'http://127.0.0.1:19099',
  NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1', NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT: '19000',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'emulator-only', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef', PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3000',
  FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '', GOOGLE_APPLICATION_CREDENTIALS: '',
};
const run = (command, args) => new Promise((done, reject) => {
  const child = spawn(command, args, { env, stdio: 'inherit', windowsHide: true });
  child.once('error', reject); child.once('exit', (code, signal) => done(signal ? 1 : code ?? 1));
});
try {
  if (mode === '--list') {
    process.exitCode = await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--list']);
  } else {
    await mkdir('work/verification/f08', { recursive: true });
    const configPath = `work/verification/f08/${project}.json`;
    await writeFile(configPath, JSON.stringify({ database: { rules: resolve('database.rules.json') },
      emulators: { auth: { host: '127.0.0.1', port: 19099 }, database: { host: '127.0.0.1', port: 19000 },
        ui: { enabled: false }, singleProjectMode: false } }, null, 2));
    console.log(`F08 target: ${project}; loopback emulators only; ${mode}`);
    const args = ['emulators:exec', '--project', project, '--config', configPath, '--only', 'auth,database', 'node scripts/run-acceptance.mjs'];
    if (process.platform === 'win32') {
      let local;
      try { local = createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js'); } catch { /* Try global npm PATH. */ }
      const candidates = [process.env.FIREBASE_CLI_JS, local,
        ...(process.env.PATH ?? '').split(delimiter).map(path => resolve(path, 'node_modules/firebase-tools/lib/bin/firebase.js'))];
      const cli = candidates.find(path => path && existsSync(path));
      if (!cli) throw new Error('Firebase CLI unavailable');
      process.exitCode = await run(process.execPath, [cli, ...args]);
    } else process.exitCode = await run('firebase', args);
  }
} catch {
  console.error('F08 could not start. Install Firebase CLI/Java and check local port permissions. No acceptance success is recorded.');
  process.exitCode = 1;
}
