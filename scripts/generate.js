import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE_DIR = join(ROOT, "cache");
const MANIFEST_PATH = join(CACHE_DIR, "manifest.json");
const SURVEY_PATH = join(CACHE_DIR, "survey.json");
const SOURCES_DIR = join(CACHE_DIR, "sources");
const CARDS_DIR = join(ROOT, "content", "cards");
const PROMPT_PATH = join(ROOT, "scripts", "prompts", "generate.txt");

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function loadSurvey() {
  if (!existsSync(SURVEY_PATH)) {
    console.error("No survey.json found. Run `npm run survey` first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(SURVEY_PATH, "utf-8"));
}

function sortByLayerAndDeps(survey) {
  const layerOrder = { L0: 0, L1: 1, L2: 2 };
  return survey.pages
    .filter((p) => p.layer !== "SKIP")
    .sort((a, b) => {
      const ld = (layerOrder[a.layer] ?? 3) - (layerOrder[b.layer] ?? 3);
      if (ld !== 0) return ld;
      if (b.dependencies?.includes(a.url)) return -1;
      if (a.dependencies?.includes(b.url)) return 1;
      return 0;
    });
}

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

function buildPrompt(url, entry, surveyPage) {
  const template = readFileSync(PROMPT_PATH, "utf-8");
  const content = readFileSync(
    join(SOURCES_DIR, `${entry.urlHash}.html`),
    "utf-8"
  );

  const trimmed = content.length > 15000 ? content.slice(0, 15000) + "\n\n[TRUNCATED]" : content;

  return template
    .replace("{{LAYER}}", surveyPage.layer)
    .replace("{{LAYER_REASON}}", surveyPage.reason || "")
    .replace("{{SUGGESTED_CARDS}}", JSON.stringify(surveyPage.suggestedCards || []))
    .replace("{{CONTENT}}", trimmed)
    .replace("{{SOURCE_URL}}", url);
}

function generateForUrl(url, manifest, surveyPage) {
  const entry = manifest.entries[url];
  if (!entry) {
    console.log(`  SKIP ${url}: not in manifest`);
    return [];
  }

  if (entry.lastGenerated && entry.lastGenerated >= entry.lastFetched) {
    console.log(`  UP-TO-DATE ${url}`);
    return entry.cardIds || [];
  }

  console.log(`  GENERATING ${url} (${surveyPage.layer})...`);
  const prompt = buildPrompt(url, entry, surveyPage);

  const tmpPrompt = join(CACHE_DIR, "_generate_prompt.txt");
  writeFileSync(tmpPrompt, prompt);

  let result;
  try {
    result = execSync(
      `cat "${tmpPrompt}" | claude -p --output-format json`,
      {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000,
      }
    );
  } catch (err) {
    console.error(`  ERROR generating for ${url}: ${err.message}`);
    return [];
  }

  let cards;
  try {
    const outer = JSON.parse(result);
    const text = outer.result || result;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    cards = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`  PARSE ERROR for ${url}. Raw output saved to cache/_last_error.txt`);
    writeFileSync(join(CACHE_DIR, "_last_error.txt"), result);
    return [];
  }

  mkdirSync(CARDS_DIR, { recursive: true });
  const cardIds = [];
  for (const card of cards) {
    card.source = url;
    card.scope = inferScope(url);
    writeFileSync(join(CARDS_DIR, `${card.id}.json`), JSON.stringify(card, null, 2));
    cardIds.push(card.id);
  }

  entry.lastGenerated = new Date().toISOString();
  entry.cardIds = cardIds;
  saveManifest(manifest);

  console.log(`  → ${cards.length} cards: ${cardIds.join(", ")}`);
  return cardIds;
}

function main() {
  const manifest = loadManifest();
  const survey = loadSurvey();
  const sorted = sortByLayerAndDeps(survey);

  const urlFlag = process.argv.indexOf("--url");
  let pagesToProcess = sorted;
  if (urlFlag !== -1 && process.argv[urlFlag + 1]) {
    const targetUrl = process.argv[urlFlag + 1];
    pagesToProcess = sorted.filter((p) => p.url === targetUrl);
    if (pagesToProcess.length === 0) {
      console.error(`URL not found in survey: ${targetUrl}`);
      process.exit(1);
    }
  }

  console.log(`Generating cards for ${pagesToProcess.length} pages...\n`);

  let totalCards = 0;
  for (const page of pagesToProcess) {
    const ids = generateForUrl(page.url, manifest, page);
    totalCards += ids.length;
  }

  console.log(`\nDone. ${totalCards} total cards generated.`);
}

main();
