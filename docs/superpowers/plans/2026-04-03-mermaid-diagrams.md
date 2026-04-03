# Mermaid Diagrams for Concept Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain-text `visual` fields in `concept-model` cards with actual Mermaid flowchart SVGs rendered at build time.

**Architecture:** Add a top-level `diagram` field (Mermaid syntax) to the 33 concept-model card JSONs via a one-time Claude-powered conversion script; render SVGs with a Node.js build script using `@mermaid-js/mermaid-isomorphic`; update `ConceptModelCard.tsx` to show `<img>` instead of text.

**Tech Stack:** Preact, Astro, Mermaid (`@mermaid-js/mermaid-isomorphic`), Claude CLI (`claude -p`), Node.js ESM scripts

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `site/src/lib/types.ts` | Modify | Remove `visual` from `ConceptModelBody`; add `diagram?: string` to `Card` |
| `site/src/components/card-renderers/ConceptModelCard.tsx` | Modify | Accept `cardId?: string`; render `<img>` when `cardId` provided |
| `site/src/components/card-renderers/ConceptModelCard.test.tsx` | Create | Test that `<img>` renders with correct `src` when `cardId` given |
| `site/src/components/CardDetail.tsx` | Modify | Pass `cardId={card.id}` to `<ConceptModelCard>` |
| `site/src/components/SwipeMode.tsx` | Modify | Pass `cardId={card.id}` to `<ConceptModelCard>` |
| `scripts/convert-visuals-to-mermaid.js` | Create | One-time script: reads `body_en.visual`, calls Claude CLI, writes `diagram` field |
| `scripts/generate-diagrams.js` | Create | Build script: reads `diagram` field, renders SVG via mermaid-isomorphic |
| `content/cards/*.json` (33 files) | Modify | Add `diagram` field, remove `body.visual` + `body_en.visual` |
| `site/public/diagrams/*.svg` (33 files) | Create | Generated SVGs committed to git |

---

## Task 1: Update TypeScript types

**Files:**
- Modify: `site/src/lib/types.ts`

- [ ] **Step 1: Update `ConceptModelBody` — remove `visual`**

In `site/src/lib/types.ts`, change:

```ts
export interface ConceptModelBody {
  concept: string;
  analogy: string;
  visual?: string;
}
```

to:

```ts
export interface ConceptModelBody {
  concept: string;
  analogy: string;
}
```

- [ ] **Step 2: Add `diagram` to `Card`**

In the same file, change:

```ts
export interface Card {
  id: string;
  type: CardType;
  title: string;
  title_en?: string;
  source: string;
  tags: string[];
  readingMinutes: number;
  body: CardBody;
  body_en?: CardBody;
}
```

to:

```ts
export interface Card {
  id: string;
  type: CardType;
  title: string;
  title_en?: string;
  source: string;
  tags: string[];
  readingMinutes: number;
  diagram?: string;
  body: CardBody;
  body_en?: CardBody;
}
```

- [ ] **Step 3: Verify TypeScript (ignoring pre-existing errors)**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx tsc --noEmit 2>&1 | grep "types.ts"
```

Expected: no output (no errors in types.ts).

- [ ] **Step 4: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/lib/types.ts
git commit -m "feat: add diagram field to Card type; remove visual from ConceptModelBody"
```

---

## Task 2: Update ConceptModelCard component (TDD)

**Files:**
- Modify: `site/src/components/card-renderers/ConceptModelCard.tsx`
- Create: `site/src/components/card-renderers/ConceptModelCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/card-renderers/ConceptModelCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import ConceptModelCard from "./ConceptModelCard";

const baseBody = {
  concept: "Test concept",
  analogy: "Test analogy",
};

describe("ConceptModelCard", () => {
  it("renders concept and analogy text", () => {
    render(<ConceptModelCard body={baseBody} lang="en" />);
    expect(screen.getByText("Test concept")).toBeInTheDocument();
    expect(screen.getByText("Test analogy")).toBeInTheDocument();
  });

  it("renders diagram img when cardId is provided", () => {
    render(<ConceptModelCard body={baseBody} lang="en" cardId="my-card-id" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/diagrams/my-card-id.svg");
    expect(img).toHaveAttribute("alt", "diagram");
  });

  it("does not render img when cardId is not provided", () => {
    render(<ConceptModelCard body={baseBody} lang="en" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test -- --testPathPattern=ConceptModelCard
```

Expected: FAIL — `cardId` prop not accepted.

- [ ] **Step 3: Update ConceptModelCard.tsx**

Replace the entire content of `site/src/components/card-renderers/ConceptModelCard.tsx`:

```tsx
import type { ConceptModelBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";

export default function ConceptModelCard({
  body,
  lang,
  cardId,
}: {
  body: ConceptModelBody;
  lang: Lang;
  cardId?: string;
}) {
  return (
    <div class="space-y-3">
      <div class="bg-purple-600/5 border-l-3 border-purple-600 p-4 rounded-r">
        <div class="text-[11px] text-purple-600 tracking-wider mb-1">{t("label.concept", lang)}</div>
        <div class="text-charcoal">{body.concept}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.analogy", lang)}</div>
        <div class="text-charcoal-light">{body.analogy}</div>
      </div>
      {cardId && (
        <div class="bg-surface-raised p-2 rounded border border-surface-border">
          <img src={`/diagrams/${cardId}.svg`} alt="diagram" class="w-full rounded" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test -- --testPathPattern=ConceptModelCard
```

Expected: PASS (3 tests).

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/components/card-renderers/ConceptModelCard.tsx site/src/components/card-renderers/ConceptModelCard.test.tsx
git commit -m "feat: add cardId prop to ConceptModelCard; render diagram img"
```

---

## Task 3: Pass cardId from callers

**Files:**
- Modify: `site/src/components/CardDetail.tsx`
- Modify: `site/src/components/SwipeMode.tsx`

- [ ] **Step 1: Update CardDetail.tsx**

In `site/src/components/CardDetail.tsx`, in the `renderBody` function, change:

```tsx
case "concept-model": return <ConceptModelCard body={body} lang={lang} />;
```

to:

```tsx
case "concept-model": return <ConceptModelCard body={body} lang={lang} cardId={card.id} />;
```

- [ ] **Step 2: Update SwipeMode.tsx**

In `site/src/components/SwipeMode.tsx`, in the `renderBody` function, change:

```tsx
case "concept-model": return <ConceptModelCard body={body} lang={lang} />;
```

to:

```tsx
case "concept-model": return <ConceptModelCard body={body} lang={lang} cardId={card.id} />;
```

- [ ] **Step 3: Check for TypeScript errors in these files**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx tsc --noEmit 2>&1 | grep -E "CardDetail|SwipeMode"
```

Expected: no output.

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/components/CardDetail.tsx site/src/components/SwipeMode.tsx
git commit -m "feat: pass cardId to ConceptModelCard in CardDetail and SwipeMode"
```

---

## Task 4: Batch convert visual text to Mermaid (one-time script)

**Files:**
- Create: `scripts/convert-visuals-to-mermaid.js`

- [ ] **Step 1: Create the conversion script**

Create `scripts/convert-visuals-to-mermaid.js`:

```js
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
```

- [ ] **Step 2: Test on one card first**

Pick one card and run the script with a dry run to verify the Mermaid output looks correct:

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && node scripts/convert-visuals-to-mermaid.js 2>&1 | head -10
```

Check the first converted card's `diagram` field:

```bash
cat content/cards/adaptive-thinking-let-claude-decide-depth.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('diagram','NO DIAGRAM'))"
```

Expected: a valid Mermaid `flowchart LR` string.

- [ ] **Step 3: Run on all remaining cards**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && node scripts/convert-visuals-to-mermaid.js
```

Expected: `33 converted, 0 skipped` (or similar — some cards may already be converted from step 2).

- [ ] **Step 4: Verify all 33 cards have diagram and no visual**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && python3 -c "
import json, os, glob
cards = glob.glob('content/cards/*.json')
with_diagram = [c for c in cards if json.load(open(c)).get('diagram')]
with_visual = [c for c in cards if json.load(open(c)).get('body_en', {}).get('visual')]
print(f'Cards with diagram: {len(with_diagram)}')
print(f'Cards still with visual: {len(with_visual)}')
"
```

Expected: `Cards with diagram: 33`, `Cards still with visual: 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add content/cards/ scripts/convert-visuals-to-mermaid.js
git commit -m "feat: convert visual text to Mermaid diagrams in all concept-model cards"
```

---

## Task 5: Build script — render Mermaid to SVG

**Files:**
- Create: `scripts/generate-diagrams.js`
- Create: `site/public/diagrams/*.svg` (33 files)

- [ ] **Step 1: Install @mermaid-js/mermaid-isomorphic**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm install --save-dev @mermaid-js/mermaid-isomorphic --legacy-peer-deps
```

Expected: package installs without error.

- [ ] **Step 2: Create the generate-diagrams script**

Create `scripts/generate-diagrams.js`:

```js
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { createMermaidRenderer } from "@mermaid-js/mermaid-isomorphic";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");
const OUTPUT_DIR = join(ROOT, "site", "public", "diagrams");

mkdirSync(OUTPUT_DIR, { recursive: true });

const renderer = createMermaidRenderer();

const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
let rendered = 0;
let skipped = 0;

for (const file of files) {
  const card = JSON.parse(readFileSync(join(CARDS_DIR, file), "utf-8"));

  if (!card.diagram) {
    skipped++;
    continue;
  }

  console.log(`[render] ${card.id}`);
  try {
    const results = await renderer([
      {
        id: card.id,
        definition: card.diagram,
        browser: false,
      },
    ]);

    const svg = results[0]?.svg;
    if (!svg) throw new Error("No SVG returned");

    writeFileSync(join(OUTPUT_DIR, `${card.id}.svg`), svg, "utf-8");
    rendered++;
    console.log(`  ✓ done`);
  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
    console.error(`  diagram: ${card.diagram.slice(0, 100)}`);
  }
}

await renderer.destroy?.();
console.log(`\nDone: ${rendered} rendered, ${skipped} skipped.`);
```

- [ ] **Step 3: Run the script**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC && node scripts/generate-diagrams.js
```

Expected: 33 SVG files created in `site/public/diagrams/`.

If `createMermaidRenderer` API differs from what's written above, check the package's README:
```bash
cat node_modules/@mermaid-js/mermaid-isomorphic/README.md 2>/dev/null | head -60
```
and adjust the script accordingly.

- [ ] **Step 4: Verify output**

```bash
ls /Users/zhaidewei/LEARN_ANTHROPIC/site/public/diagrams/ | wc -l
```

Expected: 33

```bash
ls /Users/zhaidewei/LEARN_ANTHROPIC/site/public/diagrams/ | head -5
```

Expected: SVG filenames matching card IDs.

- [ ] **Step 5: Spot-check one SVG**

```bash
head -3 /Users/zhaidewei/LEARN_ANTHROPIC/site/public/diagrams/adaptive-thinking-let-claude-decide-depth.svg
```

Expected: starts with `<svg` tag.

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add scripts/generate-diagrams.js site/public/diagrams/ site/package.json site/package-lock.json
git commit -m "feat: add generate-diagrams script; commit 33 Mermaid SVG files"
```
