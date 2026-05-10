import { access, readFile, writeFile } from "node:fs/promises";

const DEFAULT_SVG = new URL(
  "../profile-3d-contrib/profile-south-season-animate.svg",
  import.meta.url,
);
const DEFAULT_JSON = new URL(
  "../profile-3d-contrib/recent-code-languages.json",
  import.meta.url,
);
const LANGUAGE_PANEL_START = '<g transform="translate(40, 520)">';
const OTHER_COLOR = "#444444";

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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function donutLanguages(payload, limit = 5) {
  const languages = Array.isArray(payload.languages)
    ? payload.languages.filter((language) => Number(language.changes || 0) > 0)
    : [];
  const visible = languages.slice(0, limit);
  const otherChanges = languages
    .slice(limit)
    .reduce((total, language) => total + Number(language.changes || 0), 0);

  if (otherChanges > 0) {
    visible.push({ name: "Other", color: OTHER_COLOR, changes: otherChanges });
  }

  return visible;
}

function point(radius, angle) {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function renderDonutGroup(payload) {
  const languages = donutLanguages(payload);
  if (!languages.length) {
    return "";
  }

  const total = languages.reduce(
    (sum, language) => sum + Number(language.changes || 0),
    0,
  );
  if (total <= 0) {
    return "";
  }

  const parts = [LANGUAGE_PANEL_START];
  parts.push('<g transform="translate(273, 0)">');

  languages.forEach((language, index) => {
    const name = escapeXml(language.name);
    const color = escapeXml(language.color || OTHER_COLOR);
    const y = 48.75 + index * 32.5;
    parts.push(
      `<rect x="0" y="${(y - 10.8333).toFixed(4)}" width="21.6667" height="21.6667" fill="${color}" class="stroke-bg" stroke-width="1px"></rect>`,
    );
    parts.push(
      `<text dominant-baseline="middle" x="26" y="${y.toFixed(4)}" class="fill-fg" font-size="21.6667px">${name}</text>`,
    );
  });

  parts.push("</g>");
  parts.push('<g transform="translate(130, 130)">');

  let startAngle = -Math.PI / 2;
  for (const language of languages) {
    const changes = Number(language.changes || 0);
    const endAngle = startAngle + (2 * Math.PI * changes) / total;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const outerStart = point(117, startAngle);
    const outerEnd = point(117, endAngle);
    const innerEnd = point(65, endAngle);
    const innerStart = point(65, startAngle);
    const color = escapeXml(language.color || OTHER_COLOR);
    const name = escapeXml(language.name);
    const path = [
      `M${outerStart.x.toFixed(3)},${outerStart.y.toFixed(3)}`,
      `A117,117,0,${largeArc},1,${outerEnd.x.toFixed(3)},${outerEnd.y.toFixed(3)}`,
      `L${innerEnd.x.toFixed(3)},${innerEnd.y.toFixed(3)}`,
      `A65,65,0,${largeArc},0,${innerStart.x.toFixed(3)},${innerStart.y.toFixed(3)}Z`,
    ].join("");

    parts.push(
      `<path d="${path}" style="fill: ${color};" class="stroke-bg" stroke-width="2px"><title>${name} ${changes}</title></path>`,
    );
    startAngle = endAngle;
  }

  parts.push("</g>");
  parts.push("</g>");
  return parts.join("");
}

async function readPayload(jsonPath) {
  try {
    await access(jsonPath);
  } catch {
    return null;
  }

  return JSON.parse(await readFile(jsonPath, "utf8"));
}

const svgPath = argValue("--svg", DEFAULT_SVG);
const jsonPath = argValue("--json", DEFAULT_JSON);
const svg = await readFile(svgPath, "utf8");
const startIndex = svg.indexOf(LANGUAGE_PANEL_START);

if (startIndex === -1) {
  throw new Error("Could not find the 3D contribution language panel.");
}

const { before, after } = removeGroup(svg, startIndex);
const payload = await readPayload(jsonPath);
const replacement = payload ? renderDonutGroup(payload) : "";

await writeFile(svgPath, before + replacement + after);
