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
const jsonPath = join(tmp, "recent-code-languages.json");

await writeFile(
  svgPath,
  '<svg><g id="keep"></g><g transform="translate(40, 520)"><text>HTML</text><text>CSS</text></g><text>end</text></svg>',
);
await writeFile(
  jsonPath,
  JSON.stringify({
    generated_at: "2026-05-10T00:00:00Z",
    window_days: 365,
    metric: "changed_lines",
    languages: [
      { name: "Kotlin", color: "#A97BFF", changes: 50 },
      { name: "Python", color: "#3572A5", changes: 25 },
    ],
    excluded_changes: 100,
  }),
);

await runPatch(["--svg", svgPath, "--json", jsonPath]);
const patched = await readFile(svgPath, "utf8");
assert.match(patched, /id="keep"/);
assert.match(patched, /Kotlin/);
assert.match(patched, /Python/);
assert.doesNotMatch(patched, />HTML</);
assert.doesNotMatch(patched, />CSS</);
assert.match(patched, /<text>end<\/text>/);

const fallbackSvgPath = join(tmp, "fallback.svg");
await writeFile(
  fallbackSvgPath,
  '<svg><g id="keep"></g><g transform="translate(40, 520)"><text>HTML</text></g><text>end</text></svg>',
);

await runPatch(["--svg", fallbackSvgPath, "--json", join(tmp, "missing.json")]);
const fallback = await readFile(fallbackSvgPath, "utf8");
assert.match(fallback, /id="keep"/);
assert.doesNotMatch(fallback, />HTML</);
assert.match(fallback, /<text>end<\/text>/);
