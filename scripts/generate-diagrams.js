import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { createMermaidRenderer } from "mermaid-isomorphic";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");
const OUTPUT_DIR = join(ROOT, "site", "public", "diagrams");

mkdirSync(OUTPUT_DIR, { recursive: true });

const renderer = createMermaidRenderer();

function stripFences(diagram) {
  // Remove ```mermaid ... ``` or ``` ... ``` wrappers if present
  return diagram.replace(/^```(?:mermaid)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
}

const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
let rendered = 0;
let skipped = 0;

for (const file of files) {
  const card = JSON.parse(readFileSync(join(CARDS_DIR, file), "utf-8"));

  if (!card.diagram) {
    skipped++;
    continue;
  }

  const definition = stripFences(card.diagram);
  console.log(`[render] ${card.id}`);
  try {
    const results = await renderer([definition]);
    const result = results[0];

    if (result.status !== "fulfilled") {
      throw new Error(result.reason?.message || "render failed");
    }

    const svg = result.value?.svg;
    if (!svg) throw new Error("No SVG returned");

    writeFileSync(join(OUTPUT_DIR, `${card.id}.svg`), svg, "utf-8");
    rendered++;
    console.log(`  ✓ done`);
  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
    console.error(`  diagram: ${definition.slice(0, 100)}`);
  }
}

await renderer.destroy?.();
console.log(`\nDone: ${rendered} rendered, ${skipped} skipped.`);
