import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");

function callClaude(prompt) {
  const tmpFile = join(tmpdir(), `mermaid-${randomBytes(6).toString("hex")}.txt`);
  writeFileSync(tmpFile, prompt, "utf-8");
  const result = execSync(`cat "${tmpFile}" | claude -p --output-format json`, {
    encoding: "utf-8",
    maxBuffer: 5 * 1024 * 1024,
    timeout: 60000,
  });
  const parsed = JSON.parse(result);
  // claude -p returns { result: "..." } or just the text depending on version
  return (parsed.result || parsed).trim();
}

function visualToMermaid(visualText) {
  const prompt = `Convert this flowchart description to valid Mermaid syntax (flowchart LR style).

Rules:
- Use "flowchart LR" as the header
- Keep node labels short (under 30 chars)
- Use --> for arrows, -->|label| for labeled arrows
- Use {text} for decision nodes (questions/conditions)
- Use [text] for regular nodes
- Use ([text]) for start/end nodes if helpful
- Return ONLY the Mermaid code block, no explanation, no markdown fences

Description:
${visualText}`;

  return callClaude(prompt);
}

const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
let converted = 0;
let skipped = 0;

for (const file of files) {
  const path = join(CARDS_DIR, file);
  const card = JSON.parse(readFileSync(path, "utf-8"));

  // Skip if no visual field or already has diagram
  if (!card.body_en?.visual) {
    skipped++;
    continue;
  }

  if (card.diagram) {
    console.log(`[skip] ${card.id} — already has diagram`);
    skipped++;
    continue;
  }

  console.log(`[convert] ${card.id}`);
  try {
    const mermaid = visualToMermaid(card.body_en.visual);

    // Write diagram field, remove visual from both bodies
    card.diagram = mermaid;
    if (card.body?.visual !== undefined) delete card.body.visual;
    if (card.body_en?.visual !== undefined) delete card.body_en.visual;

    writeFileSync(path, JSON.stringify(card, null, 2) + "\n", "utf-8");
    converted++;
    console.log(`  ✓ done`);
  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
  }
}

console.log(`\nDone: ${converted} converted, ${skipped} skipped.`);
