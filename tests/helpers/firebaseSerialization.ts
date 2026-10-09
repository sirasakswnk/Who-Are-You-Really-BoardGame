import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';

/**
 * Exercise the installed SDK's actual DataSnapshot.val() serialization without
 * starting Firebase or connecting to a database. This internal SDK function is
 * exposed only in this test's module wrapper; node_modules is never modified.
 * If Firebase changes this internal name, update this helper, not the decoder.
 */
const localRequire = createRequire(import.meta.url);
const sdkPath = localRequire.resolve('@firebase/database');
const source = readFileSync(sdkPath, 'utf8');
const loadSerializer = runInThisContext(
  `(function(require, exports, module) {\n${source}\nreturn nodeFromJSON;\n})`,
  { filename: sdkPath }
) as (
  require: NodeRequire,
  exports: Record<string, unknown>,
  module: { exports: Record<string, unknown> }
) => (value: unknown) => { val(): unknown };
const sdkModule = { exports: {} };
const nodeFromJSON = loadSerializer(createRequire(sdkPath), sdkModule.exports, sdkModule);

export function firebaseRoundTrip(value: unknown): unknown {
  return nodeFromJSON(value).val();
}
