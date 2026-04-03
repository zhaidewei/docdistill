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

// Use Playwright for SPA pages that need JS rendering
let _browser = null;
async function fetchWithBrowser(url) {
  if (!_browser) {
    const { chromium } = await import("playwright");
    _browser = await chromium.launch({ headless: true });
  }
  const page = await _browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Wait for article content to render
    await page.waitForSelector("article", { timeout: 10000 }).catch(() => {});
    return await page.content();
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

// Discover doc URLs using Playwright (SPA needs JS)
async function discoverDocUrls() {
  console.log("Discovering doc URLs (using browser)...");
  const html = await fetchWithBrowser(DOCS_BASE);
  const $ = cheerio.load(html);
  const urls = new Set();

  $('a[href^="/docs/en/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("#")) {
      urls.add(new URL(href, "https://platform.claude.com").href);
    }
  });

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

function extractContent(html) {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();

  const selectors = ["main", "article", '[role="main"]', ".content"];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 100) {
      return el.html();
    }
  }
  return $("body").html() || html;
}

function isDocUrl(url) {
  return url.includes("platform.claude.com/docs/");
}

async function scrapeUrl(url, manifest) {
  const urlHash = hash(url);
  const existing = manifest.entries[url];

  let html;
  try {
    // Use browser for docs SPA, simple fetch for blog
    html = isDocUrl(url) ? await fetchWithBrowser(url) : await fetchPage(url);
  } catch (err) {
    console.log(`  SKIP ${url}: ${err.message}`);
    return false;
  }

  const content = extractContent(html);

  // Sanity check: skip if content is too short (likely a loading skeleton)
  const text = cheerio.load(content).root().text().replace(/\s+/g, " ").trim();
  if (text.length < 200 && isDocUrl(url)) {
    console.log(`  SKIP ${url}: content too short (${text.length} chars), likely loading state`);
    return false;
  }

  const contentHash = hash(content);

  if (existing && existing.contentHash === contentHash) {
    console.log(`  UNCHANGED ${url}`);
    return false;
  }

  mkdirSync(SOURCES_DIR, { recursive: true });
  writeFileSync(join(SOURCES_DIR, `${urlHash}.html`), content);

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
    // Blog pages don't need delay, docs pages already slow from browser
    if (!isDocUrl(url)) await new Promise((r) => setTimeout(r, 500));
  }

  await closeBrowser();
  saveManifest(manifest);
  console.log(`\nDone. ${changed} pages updated, ${urls.length - changed} unchanged.`);
}

main().catch(async (err) => {
  await closeBrowser();
  console.error(err);
  process.exit(1);
});
