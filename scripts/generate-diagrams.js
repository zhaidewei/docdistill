import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { createMermaidRenderer } from "mermaid-isomorphic";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");
const OUTPUT_DIR = join(ROOT, "site", "public", "diagrams");

mkdirSync(OUTPUT_DIR, { recursive: true });

const renderer = createMermaidRenderer();

const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
const toRender = [];

for (const file of files) {
  const card = JSON.parse(readFileSync(join(CARDS_DIR, file), "utf-8"));
  if (card.diagram) {
    toRender.push({ id: card.id, diagram: card.diagram });
  }
}

console.log(`Rendering ${toRender.length} diagrams...`);

const results = await renderer(toRender.map((c) => c.diagram));

let rendered = 0;
let failed = 0;

for (let i = 0; i < toRender.length; i++) {
  const { id } = toRender[i];
  const result = results[i];
  const svg = result?.status === "fulfilled" ? result.value?.svg : undefined;

  if (!svg) {
    console.error(`  ✗ failed: ${id}`);
    if (result?.reason) console.error(`    error: ${result.reason}`);
    failed++;
    continue;
  }

  writeFileSync(join(OUTPUT_DIR, `${id}.svg`), svg, "utf-8");
  rendered++;
  console.log(`  ✓ ${id}`);
}

console.log(`\nDone: ${rendered} rendered, ${failed} failed.`);
