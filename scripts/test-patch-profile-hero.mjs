import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const script = fileURLToPath(new URL("./patch-profile-hero.mjs", import.meta.url));

async function runPatch(args) {
  await execFileAsync("node", [script, ...args]);
}

const tmp = await mkdtemp(join(tmpdir(), "profile-hero-patch-"));
const svgPath = join(tmp, "hero.svg");

await writeFile(
  svgPath,
  '<svg><g id="keep"></g><g transform="translate(40, 520)"><text>HTML</text><text>CSS</text></g><text>end</text></svg>',
);

await runPatch(["--svg", svgPath]);
const patched = await readFile(svgPath, "utf8");
assert.match(patched, /id="keep"/);
assert.doesNotMatch(patched, /Kotlin/);
assert.doesNotMatch(patched, /Python/);
assert.doesNotMatch(patched, />HTML</);
assert.doesNotMatch(patched, />CSS</);
assert.match(patched, /<text>end<\/text>/);

const fallbackSvgPath = join(tmp, "fallback.svg");
await writeFile(
  fallbackSvgPath,
  '<svg><g id="keep"></g><text>end</text></svg>',
);

await runPatch(["--svg", fallbackSvgPath]);
const fallback = await readFile(fallbackSvgPath, "utf8");
assert.match(fallback, /id="keep"/);
assert.doesNotMatch(fallback, />HTML</);
assert.match(fallback, /<text>end<\/text>/);
