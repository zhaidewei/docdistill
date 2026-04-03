import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");

function inferScope(url) {
  const path = new URL(url).pathname;
  if (path.startsWith("/docs/en/agent-sdk/")) return "Agent SDK";
  if (path.startsWith("/docs/en/agents-and-tools/tool-use/")) return "Claude API · Tool Use";
  if (path.startsWith("/docs/en/agents-and-tools/")) return "Claude API · Agents & Tools";
  if (path.startsWith("/docs/en/build-with-claude/")) return "Claude API";
  if (path.startsWith("/docs/en/about-claude/models/")) return "Claude Models";
  if (path.startsWith("/docs/en/test-and-evaluate/")) return "Claude API · Testing";
  if (path.startsWith("/engineering/")) return "Anthropic Engineering";
  return "Claude Docs";
}

const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
let updated = 0;

for (const file of files) {
  const path = join(CARDS_DIR, file);
  const card = JSON.parse(readFileSync(path, "utf-8"));
  const scope = inferScope(card.source);
  if (card.scope !== scope) {
    card.scope = scope;
    writeFileSync(path, JSON.stringify(card, null, 2) + "\n", "utf-8");
    updated++;
  }
}

console.log(`Done: ${updated} cards updated, ${files.length - updated} already correct.`);
