import { spawn } from 'node:child_process';
import { startVitest } from 'vitest/node';
import { acceptanceEnv } from '../tests/helpers/acceptanceEnv.ts';

acceptanceEnv();
const runNode = (args, env) => new Promise((done, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env, windowsHide: true });
  child.once('error', reject); child.once('exit', (code, signal) => done(signal ? 1 : code ?? 1));
});
const ctx = await startVitest('test', [], { run: true, maxWorkers: 1, fileParallelism: false },
  process.platform === 'win32' ? { resolve: { preserveSymlinks: true } } : {});
if (!ctx) throw new Error('Vitest did not start');
const files = ctx.state.getFiles();
const failed = !files.length || files.some(file => file.result?.state === 'fail') || ctx.state.getUnhandledErrors().length > 0;
await ctx.close();
if (failed) process.exit(1);
if (process.env.F08_STAGE !== '--unit') {
  const env = { ...process.env, NODE_ENV: 'production' };
  const built = await runNode(['node_modules/next/dist/bin/next', 'build'], env);
  if (built) process.exit(built);
  process.exitCode = await runNode(['node_modules/@playwright/test/cli.js', 'test'], env);
}
