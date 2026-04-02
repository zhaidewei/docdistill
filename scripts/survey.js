import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import * as cheerio from "cheerio";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE_DIR = join(ROOT, "cache");
const MANIFEST_PATH = join(CACHE_DIR, "manifest.json");
const SURVEY_PATH = join(CACHE_DIR, "survey.json");
const PROMPT_PATH = join(ROOT, "scripts", "prompts", "survey.txt");
const SOURCES_DIR = join(CACHE_DIR, "sources");

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

function extractSummary(urlHash) {
  const filePath = join(SOURCES_DIR, `${urlHash}.html`);
  if (!existsSync(filePath)) return { title: "Unknown", summary: "" };

  const html = readFileSync(filePath, "utf-8");
  const $ = cheerio.load(html);

  const title =
    $("h1").first().text().trim() ||
    $("h2").first().text().trim() ||
    "Untitled";
  const text = $.root().text().replace(/\s+/g, " ").trim();
  const summary = text.slice(0, 500);

  return { title, summary };
}

function buildPrompt(manifest) {
  const template = readFileSync(PROMPT_PATH, "utf-8");

  const pages = Object.entries(manifest.entries).map(([url, entry]) => {
    const { title, summary } = extractSummary(entry.urlHash);
    return `URL: ${url}\nTitle: ${title}\nSummary: ${summary}\n`;
  });

  return template.replace("{{PAGES}}", pages.join("\n---\n"));
}

function main() {
  const manifest = loadManifest();
  const entryCount = Object.keys(manifest.entries).length;

  if (entryCount === 0) {
    console.log("No pages in manifest. Run `npm run scrape` first.");
    process.exit(1);
  }

  console.log(`Surveying ${entryCount} pages...`);
  const prompt = buildPrompt(manifest);

  const tmpPrompt = join(CACHE_DIR, "_survey_prompt.txt");
  writeFileSync(tmpPrompt, prompt);

  console.log("Calling claude -p (this may take a minute)...");
  const result = execSync(
    `cat "${tmpPrompt}" | claude -p --output-format json`,
    {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000,
    }
  );

  let parsed;
  try {
    const outer = JSON.parse(result);
    const text = outer.result || result;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Failed to parse Claude response. Raw output:");
    console.error(result.slice(0, 2000));
    process.exit(1);
  }

  writeFileSync(SURVEY_PATH, JSON.stringify(parsed, null, 2));
  console.log(`Survey saved to ${SURVEY_PATH}`);

  const layers = { L0: 0, L1: 0, L2: 0, SKIP: 0 };
  for (const page of parsed.pages) {
    layers[page.layer] = (layers[page.layer] || 0) + 1;
  }
  console.log("Layer distribution:", layers);
}

main();
