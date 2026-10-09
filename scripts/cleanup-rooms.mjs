import { readFile, stat } from 'node:fs/promises';
import { createFirebaseRoomStore } from '../lib/server/firebaseRestStore.ts';
import { cleanupRooms } from '../lib/server/roomMaintenance.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const HELP = `Room maintenance (Node.js 24+). Default: read-only dry-run.
  node scripts/cleanup-rooms.mjs --project PROJECT --database-url HTTPS_URL [--limit 100]
  node scripts/cleanup-rooms.mjs --project PROJECT --database-url HTTPS_URL --apply --confirm-project PROJECT
  node scripts/cleanup-rooms.mjs --fixture FILE.json [--limit 100]
Use application default credentials (GOOGLE_APPLICATION_CREDENTIALS) for a real database.
No .env file is loaded. No scheduler is installed. Reports contain only paths/counts.
Root reads are capped at 5 MiB; max 500 candidates per pass. Run dry-run again after each pass.`;

function parse(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (Object.hasOwn(flags, key)) throw new Error('Duplicate flag');
    if (['--help', '--apply', '--dry-run'].includes(key)) flags[key] = true;
    else if (['--project', '--database-url', '--limit', '--confirm-project', '--fixture'].includes(key)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Missing flag value');
      flags[key] = value;
    } else throw new Error('Unknown flag');
  }
  return flags;
}

async function main() {
  const flags = parse(process.argv.slice(2));
  if (flags['--help']) { console.log(HELP); return; }
  const apply = flags['--apply'] === true;
  const limit = Number(flags['--limit'] ?? 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500 || (apply && flags['--dry-run'])) throw new Error('Invalid options');
  let store, app;
  if (flags['--fixture']) {
    if (apply || flags['--project'] || flags['--database-url'] || flags['--confirm-project']) throw new Error('Fixture is read-only');
    if ((await stat(flags['--fixture'])).size > MAX_BYTES) throw new Error('Fixture exceeds size cap');
    const raw = JSON.parse(await readFile(flags['--fixture'], 'utf8'));
    store = { read: async () => raw, transact: async () => { throw new Error('Fixture is read-only'); } };
  } else {
    const project = flags['--project'];
    if (typeof project !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) throw new Error('Explicit project required');
    const url = new URL(flags['--database-url']);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        url.port || !['', '/'].includes(url.pathname) ||
        !/(^|\.)(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname)) throw new Error('Explicit RTDB root URL required');
    if (apply && flags['--confirm-project'] !== project) throw new Error('Apply requires matching project confirmation');
    const { applicationDefault, initializeApp } = await import('firebase-admin/app');
    const credential = applicationDefault();
    app = initializeApp({ credential, projectId: project, databaseURL: url.toString() }, 'room-maintenance');
    store = createFirebaseRoomStore({ databaseURL: url.toString(), accessToken: async () => (await credential.getAccessToken()).access_token,
      maxResponseBytes: MAX_BYTES, maxAttempts: 8, timeoutMs: 10_000 });
  }
  try {
    const report = await cleanupRooms(store, { cutoff: Date.now(), apply, limit });
    // Never serialize bindings: reservation fingerprints/match IDs are internal.
    console.log(JSON.stringify({ mode: report.mode, cutoff: report.cutoff,
      candidates: report.candidates.map(({ bucket, key }) => ({ bucket, key })),
      removed: report.removed, skipped: report.skipped }, null, 2));
  } finally {
    if (app) { const { deleteApp } = await import('firebase-admin/app'); await deleteApp(app); }
  }
}
main().catch(() => {
  console.error('Cleanup failed; result is unconfirmed. Check options/credentials/5 MiB cap and retry a dry-run. Use --help for instructions.');
  process.exitCode = 1;
});
