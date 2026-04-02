# Anthropic 碎片化学习站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal learning site that converts Anthropic docs/blog into structured flashcard-style learning materials with a knowledge graph.

**Architecture:** Two-part system — CLI pipeline scripts (scrape → survey → generate via `claude -p`) produce JSON content, consumed by an Astro static site with Preact interactive islands. All user state (bookmarks, comments, questions) lives in localStorage.

**Tech Stack:** Node.js scripts, cheerio (HTML parsing), Astro, Preact, D3.js, Tailwind CSS

---

## File Structure

```
LEARN_ANTHROPIC/
├── package.json                    # Root workspace config + pipeline script entries
├── .gitignore
├── scripts/
│   ├── scrape.js                   # URL discovery + fetch + upsert cache
│   ├── survey.js                   # claude -p global scan → layer/dependency/skip
│   ├── generate.js                 # claude -p per-page card generation
│   ├── build-graph.js              # Merge card-level edges into content/graph.json
│   └── prompts/
│       ├── survey.txt              # Prompt template for survey step
│       └── generate.txt            # Prompt template for card generation
├── cache/                          # gitignored
│   ├── sources/                    # Raw HTML keyed by URL hash
│   ├── manifest.json               # URL → contentHash/timestamps
│   └── survey.json                 # Survey output (layers, deps, skips)
├── content/                        # Committed to git
│   ├── cards/                      # One JSON per card
│   └── graph.json                  # Knowledge graph nodes + edges
├── site/
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   ├── src/
│   │   ├── layouts/
│   │   │   └── Base.astro          # HTML shell, nav, global styles
│   │   ├── pages/
│   │   │   ├── index.astro         # Card browser page
│   │   │   ├── graph.astro         # Knowledge graph page
│   │   │   └── notes.astro         # Notes + export page
│   │   ├── components/
│   │   │   ├── CardList.tsx        # Left sidebar card list (Preact)
│   │   │   ├── CardDetail.tsx      # Right panel card reader (Preact)
│   │   │   ├── CardBrowser.tsx     # Orchestrates CardList + CardDetail (Preact)
│   │   │   ├── KnowledgeGraph.tsx  # D3 force graph (Preact)
│   │   │   ├── NotesPage.tsx       # Tabs + export (Preact)
│   │   │   └── card-renderers/
│   │   │       ├── FactCard.tsx
│   │   │       ├── ProblemSolutionCard.tsx
│   │   │       ├── ConceptModelCard.tsx
│   │   │       ├── HowToCard.tsx
│   │   │       ├── ComparisonCard.tsx
│   │   │       └── ArchitectureCard.tsx
│   │   └── lib/
│   │       ├── types.ts            # Card, Graph, Annotation type definitions
│   │       └── annotations.ts     # localStorage read/write helpers
│   └── public/
│       └── cards/                  # Symlink or copy of content/cards at build time
└── docs/
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "anthropic-learn",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "scrape": "node scripts/scrape.js",
    "survey": "node scripts/survey.js",
    "generate": "node scripts/generate.js",
    "build:content": "npm run scrape && npm run survey && npm run generate",
    "dev": "cd site && npx astro dev",
    "build": "npm run build:content && cd site && npx astro build",
    "preview": "cd site && npx astro preview"
  }
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/package.json`.

- [ ] **Step 2: Update .gitignore**

```
cache/
node_modules/
.superpowers/
site/dist/
site/.astro/
.DS_Store
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/.gitignore`.

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p scripts/prompts cache/sources content/cards site/src/{layouts,pages,components/card-renderers,lib} site/public
```

- [ ] **Step 4: Install pipeline dependencies**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && npm install cheerio
```

- [ ] **Step 5: Create empty manifest and content files**

Write `cache/manifest.json`:
```json
{ "entries": {} }
```

Write `content/graph.json`:
```json
{ "nodes": [], "edges": [] }
```

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore content/graph.json
git commit -m "chore: scaffold project structure and dependencies"
```

---

### Task 2: Scrape Script — URL Discovery + Fetch + Upsert

**Files:**
- Create: `scripts/scrape.js`

This script does three things:
1. Discovers all page URLs from the two sources
2. Fetches each page's HTML
3. Upserts into cache with content hash comparison

- [ ] **Step 1: Write scrape.js**

```js
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import * as cheerio from "cheerio";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE_DIR = join(ROOT, "cache");
const SOURCES_DIR = join(CACHE_DIR, "sources");
const MANIFEST_PATH = join(CACHE_DIR, "manifest.json");

const DOCS_BASE = "https://platform.claude.com/docs/en";
const BLOG_BASE = "https://www.anthropic.com/engineering";

function hash(str) {
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { entries: {} };
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return await res.text();
}

// Discover doc page URLs by fetching the docs homepage and extracting nav links
async function discoverDocUrls() {
  console.log("Discovering doc URLs...");
  const html = await fetchPage(DOCS_BASE);
  const $ = cheerio.load(html);
  const urls = new Set();

  // Extract all internal doc links
  $('a[href^="/docs/en/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("#")) {
      urls.add(new URL(href, "https://platform.claude.com").href);
    }
  });

  // Also try links with full URL format
  $(`a[href*="platform.claude.com/docs/en/"]`).each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("#")) {
      try {
        urls.add(new URL(href).href);
      } catch {}
    }
  });

  console.log(`  Found ${urls.size} doc URLs`);
  return [...urls];
}

// Discover blog post URLs from engineering blog listing
async function discoverBlogUrls() {
  console.log("Discovering blog URLs...");
  const html = await fetchPage(BLOG_BASE);
  const $ = cheerio.load(html);
  const urls = new Set();

  $('a[href*="/research/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        urls.add(new URL(href, "https://www.anthropic.com").href);
      } catch {}
    }
  });

  $('a[href*="/engineering/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && href !== "/engineering" && href !== "/engineering/") {
      try {
        urls.add(new URL(href, "https://www.anthropic.com").href);
      } catch {}
    }
  });

  console.log(`  Found ${urls.size} blog URLs`);
  return [...urls];
}

// Extract main content text from HTML (strip nav/footer/scripts)
function extractContent(html) {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();

  // Try common content selectors
  const selectors = ["main", "article", '[role="main"]', ".content"];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 100) {
      return el.html();
    }
  }
  return $("body").html() || html;
}

async function scrapeUrl(url, manifest) {
  const urlHash = hash(url);
  const existing = manifest.entries[url];

  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.log(`  SKIP ${url}: ${err.message}`);
    return false;
  }

  const content = extractContent(html);
  const contentHash = hash(content);

  // Upsert: skip if content unchanged
  if (existing && existing.contentHash === contentHash) {
    console.log(`  UNCHANGED ${url}`);
    return false;
  }

  // Save raw HTML
  mkdirSync(SOURCES_DIR, { recursive: true });
  writeFileSync(join(SOURCES_DIR, `${urlHash}.html`), content);

  // Update manifest
  manifest.entries[url] = {
    urlHash,
    contentHash,
    lastFetched: new Date().toISOString(),
    lastGenerated: existing?.lastGenerated || null,
    cardIds: existing?.cardIds || [],
  };

  console.log(`  ${existing ? "UPDATED" : "NEW"} ${url}`);
  return true;
}

async function main() {
  mkdirSync(SOURCES_DIR, { recursive: true });
  const manifest = loadManifest();

  // Handle --url flag for single URL mode
  const urlFlag = process.argv.indexOf("--url");
  let urls;
  if (urlFlag !== -1 && process.argv[urlFlag + 1]) {
    urls = [process.argv[urlFlag + 1]];
    console.log(`Single URL mode: ${urls[0]}`);
  } else {
    const [docUrls, blogUrls] = await Promise.all([
      discoverDocUrls(),
      discoverBlogUrls(),
    ]);
    urls = [...docUrls, ...blogUrls];
    console.log(`\nTotal URLs to process: ${urls.length}`);
  }

  let changed = 0;
  for (const url of urls) {
    const didChange = await scrapeUrl(url, manifest);
    if (didChange) changed++;
    // Polite delay
    await new Promise((r) => setTimeout(r, 500));
  }

  saveManifest(manifest);
  console.log(`\nDone. ${changed} pages updated, ${urls.length - changed} unchanged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/scripts/scrape.js`.

- [ ] **Step 2: Smoke test the scrape script on a single URL**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && npm run scrape -- --url https://www.anthropic.com/engineering/claude-character
```

Expected: prints `NEW https://...`, creates a file in `cache/sources/`, updates `cache/manifest.json`.

- [ ] **Step 3: Run again to verify upsert skips unchanged content**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && npm run scrape -- --url https://www.anthropic.com/engineering/claude-character
```

Expected: prints `UNCHANGED`.

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape.js
git commit -m "feat: add scrape script with URL discovery and upsert caching"
```

---

### Task 3: Survey Script — Global Content Scan

**Files:**
- Create: `scripts/survey.js`
- Create: `scripts/prompts/survey.txt`

- [ ] **Step 1: Write the survey prompt template**

```text
You are analyzing a collection of Anthropic documentation and blog pages to plan a fragmented learning curriculum.

Below is a list of pages with their titles and content summaries. For each page, decide:

1. **Layer**: L0 (core mental model, ~15-20 cards total), L1 (practical skills, ~30-40 cards), L2 (deep/edge cases), or SKIP
2. **Dependencies**: which other pages must be understood first
3. **Suggested card types**: fact, problem-solution, concept-model, how-to, comparison, architecture

SKIP criteria — do NOT make cards for:
- Pure API reference (parameter lists, return value enums)
- Installation/setup steps
- Changelogs / version updates
- Content that duplicates another page (mark the less useful one as SKIP)

Layer criteria:
- L0: Concepts you MUST understand before anything else makes sense (e.g., Messages API structure, what Tool Use is, what an Agent loop is)
- L1: Practical knowledge for building with Claude (e.g., prompt caching usage, streaming config, error handling patterns)
- L2: Specialized or edge-case knowledge (e.g., Batch API, Admin API, specific SDK wrappers)

Output valid JSON with this structure:
{
  "pages": [
    {
      "url": "...",
      "title": "...",
      "layer": "L0" | "L1" | "L2" | "SKIP",
      "reason": "one sentence why this layer",
      "dependencies": ["url of prerequisite page", ...],
      "suggestedCards": [
        { "type": "problem-solution", "title": "short card title" }
      ]
    }
  ]
}

Here are the pages:

{{PAGES}}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/scripts/prompts/survey.txt`.

- [ ] **Step 2: Write survey.js**

```js
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

// Extract title and first ~500 chars as summary from cached HTML
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

  // Write prompt to temp file to avoid shell escaping issues
  const tmpPrompt = join(CACHE_DIR, "_survey_prompt.txt");
  writeFileSync(tmpPrompt, prompt);

  console.log("Calling claude -p (this may take a minute)...");
  const result = execSync(
    `cat "${tmpPrompt}" | claude -p --output-format json`,
    {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000, // 5 min
    }
  );

  // claude -p with --output-format json returns { result: "..." }
  let parsed;
  try {
    const outer = JSON.parse(result);
    const text = outer.result || result;
    // Extract JSON from the response (it might be wrapped in markdown code fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Failed to parse Claude response. Raw output:");
    console.error(result.slice(0, 2000));
    process.exit(1);
  }

  writeFileSync(SURVEY_PATH, JSON.stringify(parsed, null, 2));
  console.log(`Survey saved to ${SURVEY_PATH}`);

  // Print summary
  const layers = { L0: 0, L1: 0, L2: 0, SKIP: 0 };
  for (const page of parsed.pages) {
    layers[page.layer] = (layers[page.layer] || 0) + 1;
  }
  console.log("Layer distribution:", layers);
}

main();
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/scripts/survey.js`.

- [ ] **Step 3: Smoke test** (requires scraped content from Task 2)

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && npm run survey
```

Expected: calls `claude -p`, prints layer distribution, writes `cache/survey.json`.

- [ ] **Step 4: Commit**

```bash
git add scripts/survey.js scripts/prompts/survey.txt
git commit -m "feat: add survey script for content layering and dependency analysis"
```

---

### Task 4: Generate Script — Card Generation

**Files:**
- Create: `scripts/generate.js`
- Create: `scripts/prompts/generate.txt`
- Create: `scripts/build-graph.js`

- [ ] **Step 1: Write the generate prompt template**

```text
You are creating learning cards from a technical document. Each card should take 2-5 minutes to read and build one clear mental model.

## Card Types

Choose the best type for each piece of knowledge:

- **fact**: Pure facts/definitions. Body: { "fact": "...", "context": "..." }
- **problem-solution**: A real problem and its solution. Body: { "problem": "...", "solution": "...", "keyTakeaway": "..." }
- **concept-model**: Abstract concept with analogy. Body: { "concept": "...", "analogy": "...", "visual": "optional diagram description" }
- **how-to**: Step-by-step procedure. Body: { "goal": "...", "steps": ["step 1", "step 2", ...] }
- **comparison**: Two easily confused concepts. Body: { "itemA": "...", "itemB": "...", "dimensions": [{"name": "...", "a": "...", "b": "..."}] }
- **architecture**: System design / data flow. Body: { "overview": "...", "components": [{"name": "...", "role": "..."}], "flow": "step by step data flow description" }

## Writing Rules

1. Each card is SELF-CONTAINED. A reader should understand it without reading other cards. No "as mentioned above" references.
2. Use simple words. If a technical term is unavoidable, define it inline.
3. For problem-solution cards: state the problem from the developer's perspective, not abstractly.
4. Keep cards to 150 words max. If content needs more, split into multiple cards.
5. Tags should be lowercase, hyphenated, max 3 per card.

## Context

This page is categorized as: {{LAYER}} ({{LAYER_REASON}})
Suggested cards: {{SUGGESTED_CARDS}}

## Source Content

{{CONTENT}}

## Output

Output valid JSON array of cards:
[
  {
    "id": "kebab-case-id",
    "type": "problem-solution",
    "title": "Human readable title",
    "source": "{{SOURCE_URL}}",
    "tags": ["tag1", "tag2"],
    "readingMinutes": 3,
    "body": { ... },
    "relatedIds": ["other-card-id"],
    "relationType": "extends"
  }
]
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/scripts/prompts/generate.txt`.

- [ ] **Step 2: Write generate.js**

```js
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

// Topological sort: L0 first, then L1, then L2. Within each layer, dependencies first.
function sortByLayerAndDeps(survey) {
  const layerOrder = { L0: 0, L1: 1, L2: 2 };
  return survey.pages
    .filter((p) => p.layer !== "SKIP")
    .sort((a, b) => {
      const ld = (layerOrder[a.layer] ?? 3) - (layerOrder[b.layer] ?? 3);
      if (ld !== 0) return ld;
      // If b depends on a, a comes first
      if (b.dependencies?.includes(a.url)) return -1;
      if (a.dependencies?.includes(b.url)) return 1;
      return 0;
    });
}

function buildPrompt(url, entry, surveyPage) {
  const template = readFileSync(PROMPT_PATH, "utf-8");
  const content = readFileSync(
    join(SOURCES_DIR, `${entry.urlHash}.html`),
    "utf-8"
  );

  // Truncate very long content to ~15000 chars to fit in context
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

  // Skip if already generated and content hasn't changed
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

  // Write individual card files
  mkdirSync(CARDS_DIR, { recursive: true });
  const cardIds = [];
  for (const card of cards) {
    card.source = url;
    writeFileSync(join(CARDS_DIR, `${card.id}.json`), JSON.stringify(card, null, 2));
    cardIds.push(card.id);
  }

  // Update manifest
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

  // Handle --url flag
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
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/scripts/generate.js`.

- [ ] **Step 3: Write build-graph.js**

After cards are generated, this script scans all card files and assembles `content/graph.json`.

```js
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");
const GRAPH_PATH = join(ROOT, "content", "graph.json");

function main() {
  const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
  const nodes = [];
  const edges = [];
  const tagGroups = {};

  for (const file of files) {
    const card = JSON.parse(readFileSync(join(CARDS_DIR, file), "utf-8"));

    // Build node — group by first tag
    const group = card.tags?.[0] || "general";
    if (!tagGroups[group]) tagGroups[group] = [];
    tagGroups[group].push(card.id);

    nodes.push({
      id: card.id,
      label: card.title,
      group,
      type: card.type,
    });

    // Build edges from relatedIds
    if (card.relatedIds) {
      for (const relId of card.relatedIds) {
        edges.push({
          from: card.id,
          to: relId,
          relation: card.relationType || "related",
        });
      }
    }
  }

  // Deduplicate edges
  const edgeSet = new Set();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.from}-${e.to}-${e.relation}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  // Add cardCount to nodes
  for (const node of nodes) {
    node.cardCount = tagGroups[node.group]?.length || 1;
  }

  const graph = { nodes, edges: uniqueEdges };
  writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
  console.log(`Graph: ${nodes.length} nodes, ${uniqueEdges.length} edges`);
}

main();
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/scripts/build-graph.js`.

- [ ] **Step 4: Add build-graph to package.json scripts**

In `package.json`, update the `generate` script and add `build:graph`:

```json
"generate": "node scripts/generate.js && node scripts/build-graph.js",
```

- [ ] **Step 5: Commit**

```bash
git add scripts/generate.js scripts/build-graph.js scripts/prompts/generate.txt
git commit -m "feat: add generate and build-graph scripts for card production"
```

---

### Task 5: Astro Site Setup

**Files:**
- Create: `site/package.json`, `site/astro.config.mjs`, `site/tailwind.config.mjs`, `site/tsconfig.json`
- Create: `site/src/layouts/Base.astro`
- Create: `site/src/lib/types.ts`

- [ ] **Step 1: Initialize Astro project**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm init -y
npm install astro @astrojs/preact preact @astrojs/tailwind tailwindcss d3
npm install -D @types/d3
```

- [ ] **Step 2: Write astro.config.mjs**

```js
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [preact(), tailwind()],
  vite: {
    resolve: {
      alias: {
        "@content": new URL("../content", import.meta.url).pathname,
      },
    },
  },
});
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/astro.config.mjs`.

- [ ] **Step 3: Write tailwind.config.mjs**

```js
export default {
  content: ["./src/**/*.{astro,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f1117",
          raised: "#1a1c25",
          border: "#2a2d3a",
        },
        accent: {
          orange: "#f97316",
          green: "#22c55e",
          red: "#ef4444",
          blue: "#3b82f6",
        },
      },
    },
  },
};
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/tailwind.config.mjs`.

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "paths": {
      "@content/*": ["../content/*"]
    }
  }
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/tsconfig.json`.

- [ ] **Step 5: Write type definitions**

```ts
// Card types
export type CardType =
  | "fact"
  | "problem-solution"
  | "concept-model"
  | "how-to"
  | "comparison"
  | "architecture";

export interface FactBody {
  fact: string;
  context: string;
}

export interface ProblemSolutionBody {
  problem: string;
  solution: string;
  keyTakeaway: string;
}

export interface ConceptModelBody {
  concept: string;
  analogy: string;
  visual?: string;
}

export interface HowToBody {
  goal: string;
  steps: string[];
}

export interface ComparisonDimension {
  name: string;
  a: string;
  b: string;
}

export interface ComparisonBody {
  itemA: string;
  itemB: string;
  dimensions: ComparisonDimension[];
}

export interface ArchitectureComponent {
  name: string;
  role: string;
}

export interface ArchitectureBody {
  overview: string;
  components: ArchitectureComponent[];
  flow: string;
}

export type CardBody =
  | FactBody
  | ProblemSolutionBody
  | ConceptModelBody
  | HowToBody
  | ComparisonBody
  | ArchitectureBody;

export interface Card {
  id: string;
  type: CardType;
  title: string;
  source: string;
  tags: string[];
  readingMinutes: number;
  body: CardBody;
}

// Graph types
export interface GraphNode {
  id: string;
  label: string;
  group: string;
  type: CardType;
  cardCount: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: "requires" | "extends" | "related" | "compares";
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Annotation types
export interface Annotation {
  starred: boolean;
  comments: string[];
  questions: string[];
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/lib/types.ts`.

- [ ] **Step 6: Write annotations localStorage helper**

```ts
import type { Annotation } from "./types";

const PREFIX = "annotations:";

export function getAnnotation(cardId: string): Annotation {
  const raw = localStorage.getItem(PREFIX + cardId);
  if (!raw) return { starred: false, comments: [], questions: [] };
  return JSON.parse(raw);
}

export function saveAnnotation(cardId: string, annotation: Annotation) {
  localStorage.setItem(PREFIX + cardId, JSON.stringify(annotation));
}

export function getAllAnnotations(): Record<string, Annotation> {
  const result: Record<string, Annotation> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      const cardId = key.slice(PREFIX.length);
      result[cardId] = JSON.parse(localStorage.getItem(key)!);
    }
  }
  return result;
}

export function exportToMarkdown(
  cards: { id: string; title: string }[],
  annotations: Record<string, Annotation>,
  tab: "starred" | "comments" | "questions"
): string {
  const lines: string[] = [];
  const label =
    tab === "starred" ? "收藏" : tab === "comments" ? "笔记" : "问题";

  const filtered = cards.filter((c) => {
    const a = annotations[c.id];
    if (!a) return false;
    if (tab === "starred") return a.starred;
    if (tab === "comments") return a.comments.length > 0;
    return a.questions.length > 0;
  });

  lines.push(`## 我的${label}（${filtered.length} 条）\n`);

  for (const card of filtered) {
    const a = annotations[card.id];
    lines.push(`### ${card.title}`);
    if (tab === "starred") {
      lines.push(`- ⭐ 已收藏\n`);
    } else if (tab === "comments") {
      for (const c of a.comments) lines.push(`- ${c}`);
      lines.push("");
    } else {
      for (const q of a.questions) lines.push(`- ${q}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/lib/annotations.ts`.

- [ ] **Step 7: Write Base layout**

```astro
---
interface Props {
  title: string;
  activePage: "cards" | "graph" | "notes";
}

const { title, activePage } = Astro.props;

const navItems = [
  { id: "cards", label: "卡片", href: "/" },
  { id: "graph", label: "图谱", href: "/graph" },
  { id: "notes", label: "笔记", href: "/notes" },
] as const;
---

<!doctype html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} · Anthropic Learn</title>
  </head>
  <body class="bg-surface text-gray-200 min-h-screen flex flex-col">
    <nav class="flex items-center gap-6 px-6 py-3 border-b border-surface-border">
      <span class="text-accent-orange font-bold text-lg">Anthropic Learn</span>
      <div class="flex gap-1">
        {navItems.map((item) => (
          <a
            href={item.href}
            class:list={[
              "px-3 py-1.5 rounded text-sm transition-colors",
              activePage === item.id
                ? "bg-surface-raised text-white"
                : "text-gray-400 hover:text-gray-200",
            ]}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </body>
</html>
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/layouts/Base.astro`.

- [ ] **Step 8: Verify Astro dev server starts**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx astro dev
```

Expected: dev server starts on port 4321.

- [ ] **Step 9: Commit**

```bash
git add site/
git commit -m "feat: scaffold Astro site with Preact, Tailwind, types, and base layout"
```

---

### Task 6: Card Browser Page (Homepage)

**Files:**
- Create: `site/src/pages/index.astro`
- Create: `site/src/components/CardBrowser.tsx`
- Create: `site/src/components/CardList.tsx`
- Create: `site/src/components/CardDetail.tsx`
- Create: `site/src/components/card-renderers/FactCard.tsx`
- Create: `site/src/components/card-renderers/ProblemSolutionCard.tsx`
- Create: `site/src/components/card-renderers/ConceptModelCard.tsx`
- Create: `site/src/components/card-renderers/HowToCard.tsx`
- Create: `site/src/components/card-renderers/ComparisonCard.tsx`
- Create: `site/src/components/card-renderers/ArchitectureCard.tsx`

- [ ] **Step 1: Create sample card data for development**

Write 3 sample cards to `content/cards/` for testing the UI before the pipeline is complete:

`content/cards/tool-use-basics.json`:
```json
{
  "id": "tool-use-basics",
  "type": "problem-solution",
  "title": "让 Claude 调用外部工具",
  "source": "https://platform.claude.com/docs/en/agents-and-tools/tool-use",
  "tags": ["tool-use", "agent"],
  "readingMinutes": 3,
  "body": {
    "problem": "Claude 本身无法查数据库、调 API、读文件——它只能生成文本。",
    "solution": "通过 Tool Use 协议，你用 JSON Schema 定义工具（名称、参数、描述），发送给 Claude。Claude 分析用户请求后，决定是否调用工具，返回一个 tool_use 消息块。你执行工具，把结果以 tool_result 返回，Claude 基于结果继续回答。",
    "keyTakeaway": "你定义能力边界，Claude 决定什么时候用哪个工具。"
  }
}
```

`content/cards/context-window-fact.json`:
```json
{
  "id": "context-window-fact",
  "type": "fact",
  "title": "Claude 的 Context Window",
  "source": "https://platform.claude.com/docs/en/model/overview",
  "tags": ["model", "limits"],
  "readingMinutes": 1,
  "body": {
    "fact": "Claude Opus 4 支持最大 200K tokens 的 context window（约 15 万个英文单词或 50 万个中文字符）。Sonnet 和 Haiku 同样支持 200K。",
    "context": "Context window 是单次对话中 Claude 能「看到」的全部内容——包括你的系统提示、历史消息、工具定义和 Claude 的回复。超出限制的内容会被截断。"
  }
}
```

`content/cards/prompt-caching-vs-context.json`:
```json
{
  "id": "prompt-caching-vs-context",
  "type": "comparison",
  "title": "Prompt Caching vs Context Window",
  "source": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
  "tags": ["prompt-caching", "performance"],
  "readingMinutes": 2,
  "body": {
    "itemA": "Prompt Caching",
    "itemB": "Context Window",
    "dimensions": [
      { "name": "是什么", "a": "一种优化机制：把不变的 prompt 前缀缓存在服务端，避免重复处理", "b": "模型单次能处理的文本总容量上限（200K tokens）" },
      { "name": "解决什么问题", "a": "减少延迟和成本——长 system prompt 不需要每次重新编码", "b": "定义了模型的「工作记忆」大小" },
      { "name": "开发者控制", "a": "通过 cache_control 标记哪些内容要缓存", "b": "无法改变，是模型的固有限制" }
    ]
  }
}
```

- [ ] **Step 2: Write the index page**

```astro
---
import Base from "../layouts/Base.astro";
import CardBrowser from "../components/CardBrowser.tsx";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const cardsDir = join(process.cwd(), "../content/cards");
let cards = [];
try {
  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
  cards = files.map((f) =>
    JSON.parse(readFileSync(join(cardsDir, f), "utf-8"))
  );
} catch {}
---

<Base title="卡片" activePage="cards">
  <CardBrowser client:load cards={cards} />
</Base>
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/pages/index.astro`.

- [ ] **Step 3: Write CardList component**

```tsx
import type { Card } from "../lib/types";

interface Props {
  cards: Card[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  fact: "text-blue-400",
  "problem-solution": "text-accent-orange",
  "concept-model": "text-purple-400",
  "how-to": "text-accent-green",
  comparison: "text-yellow-400",
  architecture: "text-cyan-400",
};

const TYPE_LABELS: Record<string, string> = {
  fact: "FACT",
  "problem-solution": "PROBLEM → SOLUTION",
  "concept-model": "CONCEPT",
  "how-to": "HOW-TO",
  comparison: "COMPARISON",
  architecture: "ARCHITECTURE",
};

export default function CardList({
  cards,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: Props) {
  // Collect all tags
  const allTags = [...new Set(cards.flatMap((c) => c.tags))].sort();

  const filtered = filter
    ? cards.filter((c) => c.tags.includes(filter))
    : cards;

  return (
    <div class="h-full flex flex-col border-r border-surface-border">
      {/* Search & filter */}
      <div class="p-3 border-b border-surface-border space-y-2">
        <div class="flex gap-1 flex-wrap">
          <button
            onClick={() => onFilterChange("")}
            class={`px-2 py-0.5 rounded text-xs transition-colors ${
              !filter
                ? "bg-accent-orange text-white"
                : "bg-surface-raised text-gray-400 hover:text-gray-200"
            }`}
          >
            全部 ({cards.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onFilterChange(tag)}
              class={`px-2 py-0.5 rounded text-xs transition-colors ${
                filter === tag
                  ? "bg-accent-orange text-white"
                  : "bg-surface-raised text-gray-400 hover:text-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Card list */}
      <div class="flex-1 overflow-y-auto">
        {filtered.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            class={`w-full text-left p-3 border-b border-surface-border transition-colors ${
              selectedId === card.id
                ? "bg-surface-raised border-l-2 border-l-accent-orange"
                : "hover:bg-surface-raised/50"
            }`}
          >
            <span
              class={`text-[11px] tracking-wider ${TYPE_COLORS[card.type] || "text-gray-400"}`}
            >
              {TYPE_LABELS[card.type] || card.type.toUpperCase()}
            </span>
            <div class="text-sm mt-1">{card.title}</div>
            <div class="text-xs text-gray-500 mt-1">
              {card.readingMinutes} min · {card.tags.join(", ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/CardList.tsx`.

- [ ] **Step 4: Write card renderer components**

`FactCard.tsx`:
```tsx
import type { FactBody } from "../../lib/types";

export default function FactCard({ body }: { body: FactBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-blue-500/10 border-l-3 border-blue-400 p-4 rounded-r">
        <div class="text-[11px] text-blue-400 tracking-wider mb-1">FACT</div>
        <div class="text-gray-200">{body.fact}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">CONTEXT</div>
        <div class="text-gray-400 text-sm">{body.context}</div>
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/card-renderers/FactCard.tsx`.

`ProblemSolutionCard.tsx`:
```tsx
import type { ProblemSolutionBody } from "../../lib/types";

export default function ProblemSolutionCard({ body }: { body: ProblemSolutionBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-red-500/10 border-l-3 border-accent-red p-4 rounded-r">
        <div class="text-[11px] text-accent-red tracking-wider mb-1">PROBLEM</div>
        <div class="text-gray-200">{body.problem}</div>
      </div>
      <div class="bg-green-500/10 border-l-3 border-accent-green p-4 rounded-r">
        <div class="text-[11px] text-accent-green tracking-wider mb-1">SOLUTION</div>
        <div class="text-gray-200">{body.solution}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">💡 KEY TAKEAWAY</div>
        <div class="text-gray-300">{body.keyTakeaway}</div>
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/card-renderers/ProblemSolutionCard.tsx`.

`ConceptModelCard.tsx`:
```tsx
import type { ConceptModelBody } from "../../lib/types";

export default function ConceptModelCard({ body }: { body: ConceptModelBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-purple-500/10 border-l-3 border-purple-400 p-4 rounded-r">
        <div class="text-[11px] text-purple-400 tracking-wider mb-1">CONCEPT</div>
        <div class="text-gray-200">{body.concept}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">🧠 ANALOGY</div>
        <div class="text-gray-300">{body.analogy}</div>
      </div>
      {body.visual && (
        <div class="bg-surface-raised p-4 rounded border border-surface-border">
          <div class="text-[11px] text-gray-500 tracking-wider mb-1">📐 VISUAL</div>
          <div class="text-gray-400 text-sm italic">{body.visual}</div>
        </div>
      )}
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/card-renderers/ConceptModelCard.tsx`.

`HowToCard.tsx`:
```tsx
import type { HowToBody } from "../../lib/types";

export default function HowToCard({ body }: { body: HowToBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-green-500/10 border-l-3 border-accent-green p-4 rounded-r">
        <div class="text-[11px] text-accent-green tracking-wider mb-1">GOAL</div>
        <div class="text-gray-200">{body.goal}</div>
      </div>
      <ol class="space-y-2 pl-0">
        {body.steps.map((step, i) => (
          <li key={i} class="flex gap-3 bg-surface-raised p-3 rounded">
            <span class="text-accent-green font-mono text-sm shrink-0">
              {i + 1}.
            </span>
            <span class="text-gray-300 text-sm">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/card-renderers/HowToCard.tsx`.

`ComparisonCard.tsx`:
```tsx
import type { ComparisonBody } from "../../lib/types";

export default function ComparisonCard({ body }: { body: ComparisonBody }) {
  return (
    <div class="space-y-3">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-border">
              <th class="text-left p-2 text-gray-500 font-normal"></th>
              <th class="text-left p-2 text-accent-orange font-medium">{body.itemA}</th>
              <th class="text-left p-2 text-blue-400 font-medium">{body.itemB}</th>
            </tr>
          </thead>
          <tbody>
            {body.dimensions.map((dim, i) => (
              <tr key={i} class="border-b border-surface-border/50">
                <td class="p-2 text-gray-400 font-medium">{dim.name}</td>
                <td class="p-2 text-gray-300">{dim.a}</td>
                <td class="p-2 text-gray-300">{dim.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/card-renderers/ComparisonCard.tsx`.

`ArchitectureCard.tsx`:
```tsx
import type { ArchitectureBody } from "../../lib/types";

export default function ArchitectureCard({ body }: { body: ArchitectureBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-cyan-500/10 border-l-3 border-cyan-400 p-4 rounded-r">
        <div class="text-[11px] text-cyan-400 tracking-wider mb-1">OVERVIEW</div>
        <div class="text-gray-200">{body.overview}</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        {body.components.map((comp, i) => (
          <div key={i} class="bg-surface-raised p-3 rounded border border-surface-border">
            <div class="text-sm font-medium text-gray-200">{comp.name}</div>
            <div class="text-xs text-gray-400 mt-1">{comp.role}</div>
          </div>
        ))}
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">🔄 FLOW</div>
        <div class="text-gray-300 text-sm">{body.flow}</div>
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/card-renderers/ArchitectureCard.tsx`.

- [ ] **Step 5: Write CardDetail component**

```tsx
import { useState } from "preact/hooks";
import type { Card, Annotation } from "../lib/types";
import { getAnnotation, saveAnnotation } from "../lib/annotations";
import FactCard from "./card-renderers/FactCard";
import ProblemSolutionCard from "./card-renderers/ProblemSolutionCard";
import ConceptModelCard from "./card-renderers/ConceptModelCard";
import HowToCard from "./card-renderers/HowToCard";
import ComparisonCard from "./card-renderers/ComparisonCard";
import ArchitectureCard from "./card-renderers/ArchitectureCard";

const TYPE_LABELS: Record<string, string> = {
  fact: "FACT",
  "problem-solution": "PROBLEM → SOLUTION",
  "concept-model": "CONCEPT",
  "how-to": "HOW-TO",
  comparison: "COMPARISON",
  architecture: "ARCHITECTURE",
};

const TYPE_COLORS: Record<string, string> = {
  fact: "text-blue-400",
  "problem-solution": "text-accent-orange",
  "concept-model": "text-purple-400",
  "how-to": "text-accent-green",
  comparison: "text-yellow-400",
  architecture: "text-cyan-400",
};

function renderBody(card: Card) {
  switch (card.type) {
    case "fact":
      return <FactCard body={card.body as any} />;
    case "problem-solution":
      return <ProblemSolutionCard body={card.body as any} />;
    case "concept-model":
      return <ConceptModelCard body={card.body as any} />;
    case "how-to":
      return <HowToCard body={card.body as any} />;
    case "comparison":
      return <ComparisonCard body={card.body as any} />;
    case "architecture":
      return <ArchitectureCard body={card.body as any} />;
  }
}

export default function CardDetail({ card }: { card: Card }) {
  const [annotation, setAnnotation] = useState<Annotation>(() =>
    getAnnotation(card.id)
  );
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<"comment" | "question" | null>(
    null
  );

  function update(patch: Partial<Annotation>) {
    const next = { ...annotation, ...patch };
    setAnnotation(next);
    saveAnnotation(card.id, next);
  }

  function submitInput() {
    if (!input.trim() || !inputMode) return;
    if (inputMode === "comment") {
      update({ comments: [...annotation.comments, input.trim()] });
    } else {
      update({ questions: [...annotation.questions, input.trim()] });
    }
    setInput("");
    setInputMode(null);
  }

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="p-5 border-b border-surface-border">
        <span
          class={`text-[11px] tracking-wider ${TYPE_COLORS[card.type] || "text-gray-400"}`}
        >
          {TYPE_LABELS[card.type] || card.type.toUpperCase()}
        </span>
        <h2 class="text-lg font-medium mt-1">{card.title}</h2>
        <div class="text-xs text-gray-500 mt-1">
          {card.readingMinutes} min · {card.tags.join(", ")} ·{" "}
          <a
            href={card.source}
            target="_blank"
            class="text-accent-orange hover:underline"
          >
            来源
          </a>
        </div>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto p-5">{renderBody(card)}</div>

      {/* Annotations display */}
      {(annotation.comments.length > 0 || annotation.questions.length > 0) && (
        <div class="px-5 pb-3 space-y-2">
          {annotation.comments.map((c, i) => (
            <div key={`c${i}`} class="text-xs bg-surface-raised p-2 rounded text-gray-400">
              💬 {c}
            </div>
          ))}
          {annotation.questions.map((q, i) => (
            <div key={`q${i}`} class="text-xs bg-surface-raised p-2 rounded text-yellow-400/70">
              ❓ {q}
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      {inputMode && (
        <div class="px-5 pb-3 flex gap-2">
          <input
            type="text"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && submitInput()}
            placeholder={
              inputMode === "comment" ? "写笔记..." : "写问题..."
            }
            class="flex-1 bg-surface-raised border border-surface-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent-orange"
            autoFocus
          />
          <button
            onClick={submitInput}
            class="px-3 py-1.5 bg-accent-orange text-white rounded text-sm hover:bg-accent-orange/80"
          >
            保存
          </button>
          <button
            onClick={() => {
              setInputMode(null);
              setInput("");
            }}
            class="px-3 py-1.5 text-gray-400 text-sm hover:text-gray-200"
          >
            取消
          </button>
        </div>
      )}

      {/* Action bar */}
      <div class="flex gap-2 p-3 border-t border-surface-border">
        <button
          onClick={() => update({ starred: !annotation.starred })}
          class={`px-3 py-1.5 rounded text-sm transition-colors ${
            annotation.starred
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-surface-raised text-gray-400 hover:text-gray-200"
          }`}
        >
          ⭐ 标记
        </button>
        <button
          onClick={() => setInputMode("comment")}
          class="px-3 py-1.5 rounded text-sm bg-surface-raised text-gray-400 hover:text-gray-200"
        >
          💬 Comment
        </button>
        <button
          onClick={() => setInputMode("question")}
          class="px-3 py-1.5 rounded text-sm bg-surface-raised text-gray-400 hover:text-gray-200"
        >
          ❓ 提问
        </button>
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/CardDetail.tsx`.

- [ ] **Step 6: Write CardBrowser orchestrator**

```tsx
import { useState } from "preact/hooks";
import type { Card } from "../lib/types";
import CardList from "./CardList";
import CardDetail from "./CardDetail";

export default function CardBrowser({ cards }: { cards: Card[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    cards[0]?.id || null
  );
  const [filter, setFilter] = useState("");

  const selectedCard = cards.find((c) => c.id === selectedId) || null;

  return (
    <div class="flex h-[calc(100vh-49px)]">
      <div class="w-[320px] shrink-0">
        <CardList
          cards={cards}
          selectedId={selectedId}
          onSelect={setSelectedId}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>
      <div class="flex-1">
        {selectedCard ? (
          <CardDetail key={selectedCard.id} card={selectedCard} />
        ) : (
          <div class="flex items-center justify-center h-full text-gray-500">
            选择一张卡片开始阅读
          </div>
        )}
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/CardBrowser.tsx`.

- [ ] **Step 7: Verify in browser**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && npm run dev
```

Open http://localhost:4321. Expected: see 3 sample cards in left sidebar, click one to see detail on the right with proper type rendering and annotation buttons.

- [ ] **Step 8: Commit**

```bash
git add site/src/ content/cards/
git commit -m "feat: add card browser page with sidebar drawer layout and 6 card renderers"
```

---

### Task 7: Knowledge Graph Page

**Files:**
- Create: `site/src/pages/graph.astro`
- Create: `site/src/components/KnowledgeGraph.tsx`

- [ ] **Step 1: Create sample graph.json for development**

Update `content/graph.json`:
```json
{
  "nodes": [
    { "id": "tool-use-basics", "label": "Tool Use", "group": "agent", "type": "problem-solution", "cardCount": 3 },
    { "id": "context-window-fact", "label": "Context Window", "group": "model", "type": "fact", "cardCount": 1 },
    { "id": "prompt-caching-vs-context", "label": "Prompt Caching", "group": "performance", "type": "comparison", "cardCount": 2 }
  ],
  "edges": [
    { "from": "prompt-caching-vs-context", "to": "context-window-fact", "relation": "requires" },
    { "from": "tool-use-basics", "to": "context-window-fact", "relation": "related" }
  ]
}
```

- [ ] **Step 2: Write the graph page**

```astro
---
import Base from "../layouts/Base.astro";
import KnowledgeGraph from "../components/KnowledgeGraph.tsx";
import { readFileSync } from "fs";
import { join } from "path";

const graphPath = join(process.cwd(), "../content/graph.json");
let graph = { nodes: [], edges: [] };
try {
  graph = JSON.parse(readFileSync(graphPath, "utf-8"));
} catch {}

const cardsDir = join(process.cwd(), "../content/cards");
let cards = [];
try {
  const { readdirSync } = await import("fs");
  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
  cards = files.map((f) =>
    JSON.parse(readFileSync(join(cardsDir, f), "utf-8"))
  );
} catch {}
---

<Base title="知识图谱" activePage="graph">
  <KnowledgeGraph client:only="preact" graph={graph} cards={cards} />
</Base>
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/pages/graph.astro`.

- [ ] **Step 3: Write KnowledgeGraph component**

```tsx
import { useEffect, useRef, useState } from "preact/hooks";
import type { Graph, Card, GraphNode } from "../lib/types";

// D3 imported dynamically since it's large
let d3: typeof import("d3");

const RELATION_COLORS: Record<string, string> = {
  requires: "#f97316",
  extends: "#22c55e",
  related: "#4b5563",
  compares: "#eab308",
};

interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export default function KnowledgeGraph({
  graph,
  cards,
}: {
  graph: Graph;
  cards: Card[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<SimNode | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    import("d3").then((d3Module) => {
      d3 = d3Module;
      renderGraph();
    });
  }, []);

  function renderGraph() {
    const svg = d3.select(svgRef.current!);
    const width = svgRef.current!.clientWidth;
    const height = svgRef.current!.clientHeight;

    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
    const links = graph.edges.map((e) => ({
      source: e.from,
      target: e.to,
      relation: e.relation,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Links
    const link = g
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => RELATION_COLORS[d.relation] || "#4b5563")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    // Nodes
    const node = g
      .selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append("circle")
      .attr("r", (d) => 16 + (d.cardCount || 1) * 4)
      .attr("fill", "rgba(249, 115, 22, 0.15)")
      .attr("stroke", "#f97316")
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "11px");

    node.on("click", (event: any, d: SimNode) => {
      setSelected(d);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  // Find related info for selected node
  const relatedEdges = selected
    ? graph.edges.filter(
        (e) => e.from === selected.id || e.to === selected.id
      )
    : [];

  const requires = relatedEdges
    .filter((e) => e.to === selected?.id && e.relation === "requires")
    .map((e) => graph.nodes.find((n) => n.id === e.from)?.label)
    .filter(Boolean);

  const extends_ = relatedEdges
    .filter((e) => e.from === selected?.id && e.relation === "extends")
    .map((e) => graph.nodes.find((n) => n.id === e.to)?.label)
    .filter(Boolean);

  return (
    <div class="relative h-[calc(100vh-49px)]">
      <svg ref={svgRef} class="w-full h-full" />

      {/* Selected node info panel */}
      {selected && (
        <div class="absolute top-4 right-4 w-56 bg-black/80 border border-accent-orange/30 rounded-lg p-4 text-sm">
          <div class="text-[11px] text-accent-orange tracking-wider mb-1">
            SELECTED NODE
          </div>
          <div class="font-medium text-base mb-2">{selected.label}</div>
          <div class="text-gray-500 text-xs mb-3">
            {selected.cardCount} 张卡片 · {selected.group}
          </div>

          {requires.length > 0 && (
            <div class="text-gray-400 text-xs mb-1">
              <span class="text-accent-orange">←</span> 需要先了解:{" "}
              {requires.join(", ")}
            </div>
          )}
          {extends_.length > 0 && (
            <div class="text-gray-400 text-xs mb-3">
              <span class="text-accent-green">→</span> 延伸:{" "}
              {extends_.join(", ")}
            </div>
          )}

          <a
            href={`/?card=${selected.id}`}
            class="block text-center bg-surface-raised text-gray-200 px-3 py-1.5 rounded text-xs hover:bg-surface-raised/80"
          >
            查看相关卡片 →
          </a>
        </div>
      )}

      {/* Legend */}
      <div class="absolute bottom-4 left-4 bg-black/60 rounded-lg p-3 text-xs space-y-1">
        {Object.entries(RELATION_COLORS).map(([rel, color]) => (
          <div key={rel} class="flex items-center gap-2">
            <div class="w-4 h-0.5" style={{ backgroundColor: color }} />
            <span class="text-gray-400">{rel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/KnowledgeGraph.tsx`.

- [ ] **Step 4: Verify in browser**

Open http://localhost:4321/graph. Expected: see 3 nodes with connecting lines, draggable, zoomable, click shows info panel.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/graph.astro site/src/components/KnowledgeGraph.tsx content/graph.json
git commit -m "feat: add knowledge graph page with D3 force layout"
```

---

### Task 8: Notes Page + Export

**Files:**
- Create: `site/src/pages/notes.astro`
- Create: `site/src/components/NotesPage.tsx`

- [ ] **Step 1: Write the notes page**

```astro
---
import Base from "../layouts/Base.astro";
import NotesPage from "../components/NotesPage.tsx";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const cardsDir = join(process.cwd(), "../content/cards");
let cards = [];
try {
  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
  cards = files.map((f) => {
    const c = JSON.parse(readFileSync(join(cardsDir, f), "utf-8"));
    return { id: c.id, title: c.title };
  });
} catch {}
---

<Base title="笔记" activePage="notes">
  <NotesPage client:load cards={cards} />
</Base>
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/pages/notes.astro`.

- [ ] **Step 2: Write NotesPage component**

```tsx
import { useState, useEffect } from "preact/hooks";
import { getAllAnnotations, exportToMarkdown } from "../lib/annotations";
import type { Annotation } from "../lib/types";

type Tab = "starred" | "comments" | "questions";

interface CardMeta {
  id: string;
  title: string;
}

export default function NotesPage({ cards }: { cards: CardMeta[] }) {
  const [tab, setTab] = useState<Tab>("starred");
  const [annotations, setAnnotations] = useState<Record<string, Annotation>>(
    {}
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    setAnnotations(getAllAnnotations());
  }, []);

  const filteredCards = cards.filter((c) => {
    const a = annotations[c.id];
    if (!a) return false;
    if (tab === "starred") return a.starred;
    if (tab === "comments") return a.comments.length > 0;
    return a.questions.length > 0;
  });

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === filteredCards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredCards.map((c) => c.id)));
    }
  }

  async function copyToClipboard() {
    const toExport =
      selected.size > 0
        ? cards.filter((c) => selected.has(c.id))
        : filteredCards;
    const md = exportToMarkdown(toExport, annotations, tab);
    await navigator.clipboard.writeText(md);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "starred", label: "收藏", icon: "⭐" },
    { id: "comments", label: "笔记", icon: "💬" },
    { id: "questions", label: "问题", icon: "❓" },
  ];

  return (
    <div class="max-w-3xl mx-auto p-6">
      {/* Tabs */}
      <div class="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSelected(new Set());
            }}
            class={`px-4 py-2 rounded text-sm transition-colors ${
              tab === t.id
                ? "bg-accent-orange text-white"
                : "bg-surface-raised text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div class="flex items-center justify-between mb-4">
        <label class="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={
              filteredCards.length > 0 &&
              selected.size === filteredCards.length
            }
            onChange={selectAll}
            class="rounded"
          />
          全选 ({filteredCards.length})
        </label>
        <button
          onClick={copyToClipboard}
          class="px-4 py-1.5 bg-accent-orange text-white rounded text-sm hover:bg-accent-orange/80 transition-colors"
        >
          {copyFeedback
            ? "✓ 已复制"
            : `📋 复制到剪贴板${selected.size > 0 ? ` (${selected.size})` : ""}`}
        </button>
      </div>

      {/* List */}
      {filteredCards.length === 0 ? (
        <div class="text-center text-gray-500 py-16">
          还没有{tabs.find((t) => t.id === tab)?.label}
        </div>
      ) : (
        <div class="space-y-2">
          {filteredCards.map((card) => {
            const a = annotations[card.id];
            return (
              <div
                key={card.id}
                class={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                  selected.has(card.id)
                    ? "border-accent-orange bg-accent-orange/5"
                    : "border-surface-border bg-surface-raised"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(card.id)}
                  onChange={() => toggleSelect(card.id)}
                  class="mt-1 rounded"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{card.title}</div>
                  {tab === "comments" &&
                    a.comments.map((c, i) => (
                      <div key={i} class="text-xs text-gray-400 mt-1">
                        💬 {c}
                      </div>
                    ))}
                  {tab === "questions" &&
                    a.questions.map((q, i) => (
                      <div key={i} class="text-xs text-yellow-400/70 mt-1">
                        ❓ {q}
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

Write to `/Users/zhaidewei/LEARN_ANTHROPIC/site/src/components/NotesPage.tsx`.

- [ ] **Step 3: Verify in browser**

Open http://localhost:4321/notes. Expected: empty state initially. Go to cards page, star a card and add a comment, then return to notes page — should show the annotation. Click "复制到剪贴板" — should copy formatted Markdown.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/notes.astro site/src/components/NotesPage.tsx
git commit -m "feat: add notes page with tabs and clipboard export"
```

---

### Task 9: End-to-End Pipeline Test

**Files:** None (integration test using existing scripts)

- [ ] **Step 1: Run full scrape on a small set**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && npm run scrape -- --url https://www.anthropic.com/engineering/claude-character
```

- [ ] **Step 2: Run survey**

```bash
npm run survey
```

Inspect `cache/survey.json` — verify it has layer assignments and suggested cards.

- [ ] **Step 3: Run generate**

```bash
npm run generate
```

Inspect `content/cards/` — verify new JSON card files were created with correct structure.

- [ ] **Step 4: Build and preview the site**

```bash
npm run dev
```

Open http://localhost:4321, verify the generated cards render correctly alongside the sample cards.

- [ ] **Step 5: Clean up sample cards if pipeline-generated cards are present**

Remove the 3 sample cards from Task 6 Step 1 if they conflict with or duplicate pipeline output.

- [ ] **Step 6: Commit all generated content**

```bash
git add content/
git commit -m "feat: add pipeline-generated learning cards and graph"
```
