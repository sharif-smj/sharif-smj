import { readFile, writeFile } from "node:fs/promises";

const DEFAULT_SVG = new URL(
  "../profile-3d-contrib/profile-south-season-animate.svg",
  import.meta.url,
);
const LANGUAGE_PANEL_START = '<g transform="translate(40, 520)">';

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function removeGroup(svg, startIndex) {
  const tagPattern = /<\/?g(?=[\s>])/g;
  tagPattern.lastIndex = startIndex;

  let depth = 0;
  let match;

  while ((match = tagPattern.exec(svg)) !== null) {
    if (match[0] === "<g") {
      depth += 1;
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      const end = svg.indexOf(">", match.index);
      if (end === -1) {
        throw new Error("Malformed SVG group close tag.");
      }
      return {
        before: svg.slice(0, startIndex),
        after: svg.slice(end + 1),
      };
    }
  }

  throw new Error("Could not find the end of the 3D contribution language panel.");
}

const svgPath = argValue("--svg", DEFAULT_SVG);
const svg = await readFile(svgPath, "utf8");
const startIndex = svg.indexOf(LANGUAGE_PANEL_START);

if (startIndex === -1) {
  process.exit(0);
}

const { before, after } = removeGroup(svg, startIndex);

await writeFile(svgPath, before + after);
