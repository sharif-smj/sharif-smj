import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../profile-3d-contrib/profile-night-rainbow.svg", import.meta.url);
const languagePanelStart = '<g transform="translate(40, 520)">';

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

      return svg.slice(0, startIndex) + svg.slice(end + 1);
    }
  }

  throw new Error("Could not find the end of the 3D contribution language panel.");
}

const svg = await readFile(target, "utf8");
const startIndex = svg.indexOf(languagePanelStart);

if (startIndex === -1) {
  throw new Error("Could not find the 3D contribution language panel.");
}

await writeFile(target, removeGroup(svg, startIndex));
