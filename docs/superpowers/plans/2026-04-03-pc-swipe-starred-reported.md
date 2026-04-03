# PC 刷卡模式 + 收藏/报错功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PC-accessible swipe mode at `/swipe`, keyboard shortcuts ↑↓ for star/report, and global nav entries for starred and reported card collections.

**Architecture:** Extend the existing `SwipeMode.tsx` (used on mobile) to support star/report actions and run inside the standard Base layout; add a shared `CollectionPage.tsx` component for the two new list pages; extend `Annotation` with a `reported` boolean stored in localStorage.

**Tech Stack:** Preact, Astro, Tailwind CSS, localStorage (via existing `annotations.ts`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `site/src/lib/types.ts` | Modify | Add `reported: boolean` to `Annotation` |
| `site/src/lib/annotations.ts` | Modify | Add `reported: false` to default in `getAnnotation` |
| `site/src/lib/annotations.test.ts` | Modify | Update default shape assertion; add `reported` round-trip test |
| `site/src/lib/i18n.ts` | Modify | Add nav + collection + swipe action keys |
| `site/src/components/SwipeMode.tsx` | Modify | Add ↑↓ keyboard, toggleStar/toggleReported, 4-button bar, 4 indicators, `h-full` |
| `site/src/components/CollectionPage.tsx` | Create | Shared list for starred / reported cards |
| `site/src/components/NavLinks.tsx` | Modify | Add swipe, starred, reported tabs |
| `site/src/components/MobileNav.tsx` | Modify | Add swipe tab; update `activePage` union type |
| `site/src/layouts/Base.astro` | Modify | Extend `activePage` union type |
| `site/src/pages/swipe.astro` | Create | PC swipe page (SwipeMode inside Base) |
| `site/src/pages/starred.astro` | Create | Starred collection page |
| `site/src/pages/reported.astro` | Create | Reported cards page |
| `site/src/pages/cards.astro` | Modify | Wrap mobile SwipeMode in `h-screen` div so `h-full` inside works |
| `site/src/pages/index.astro` | Modify | Add swipe/starred/reported links to homepage nav |

---

## Task 1: Data layer — add `reported` field

**Files:**
- Modify: `site/src/lib/types.ts`
- Modify: `site/src/lib/annotations.ts`
- Modify: `site/src/lib/annotations.test.ts`

- [ ] **Step 1: Update the failing test first**

Open `site/src/lib/annotations.test.ts` and update the default-shape assertion to include `reported: false`:

```ts
it("returns an empty annotation when a card has no saved data", () => {
  expect(getAnnotation("missing")).toEqual({
    starred: false,
    comments: [],
    questions: [],
    reported: false,
  });
});
```

Also add a new test case at the end of the `describe` block:

```ts
it("saves and reads the reported flag", () => {
  const annotation = {
    starred: false,
    comments: [],
    questions: [],
    reported: true,
  };
  saveAnnotation("card-reported", annotation);
  expect(getAnnotation("card-reported").reported).toBe(true);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test -- --testPathPattern=annotations
```

Expected: FAIL — `reported` property missing from default return value.

- [ ] **Step 3: Add `reported` to the `Annotation` type**

In `site/src/lib/types.ts`, change:

```ts
export interface Annotation {
  starred: boolean;
  comments: string[];
  questions: string[];
}
```

to:

```ts
export interface Annotation {
  starred: boolean;
  comments: string[];
  questions: string[];
  reported: boolean;
}
```

- [ ] **Step 4: Update `getAnnotation` default**

In `site/src/lib/annotations.ts`, change the default return in `getAnnotation`:

```ts
export function getAnnotation(cardId: string): Annotation {
  if (!isBrowser) return { starred: false, comments: [], questions: [], reported: false };
  const raw = localStorage.getItem(PREFIX + cardId);
  if (!raw) return { starred: false, comments: [], questions: [], reported: false };
  const parsed = JSON.parse(raw);
  // backfill reported for annotations saved before this field existed
  return { reported: false, ...parsed };
}
```

The spread `{ reported: false, ...parsed }` ensures old localStorage entries without `reported` get the default without losing their existing data.

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test -- --testPathPattern=annotations
```

Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/lib/types.ts site/src/lib/annotations.ts site/src/lib/annotations.test.ts
git commit -m "feat: add reported field to Annotation type and storage"
```

---

## Task 2: i18n additions

**Files:**
- Modify: `site/src/lib/i18n.ts`

- [ ] **Step 1: Add new string keys**

In `site/src/lib/i18n.ts`, inside the `strings` object, add the following entries (place them after the existing `// Nav` section and `// Swipe mode` section respectively):

After `"nav.notes"`:
```ts
"nav.swipe": { zh: "刷卡", en: "Swipe" },
"nav.starred": { zh: "⭐ 收藏", en: "⭐ Starred" },
"nav.reported": { zh: "🚩 报错", en: "🚩 Reported" },
```

After `"swipe.startReview"`:
```ts
"swipe.starLabel": { zh: "收藏", en: "Star" },
"swipe.reportLabel": { zh: "报错", en: "Report" },
```

After `// Notes page` section (add a new `// Collection pages` section):
```ts
// Collection pages
"collection.starred.title": { zh: "我的收藏", en: "Starred Cards" },
"collection.starred.empty": { zh: "还没有收藏的卡片", en: "No starred cards yet" },
"collection.reported.title": { zh: "报错卡片", en: "Reported Cards" },
"collection.reported.empty": { zh: "没有报错记录", en: "No reported cards" },
"collection.reported.desc": { zh: "以下卡片被标记为内容有误，供核查", en: "These cards have been flagged as potentially incorrect." },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/lib/i18n.ts
git commit -m "feat: add i18n keys for swipe actions and collection pages"
```

---

## Task 3: SwipeMode enhancements

**Files:**
- Modify: `site/src/components/SwipeMode.tsx`

- [ ] **Step 1: Add imports and new state**

At the top of `SwipeMode.tsx`, add to the existing imports:

```ts
import { getAnnotation, saveAnnotation } from "../lib/annotations";
import type { Annotation } from "../lib/types";
```

Inside the component, after the existing `useState` declarations, add:

```ts
const [annotation, setAnnotation] = useState<Annotation>(() =>
  current ? getAnnotation(current.id) : { starred: false, reported: false, comments: [], questions: [] }
);
const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);
```

- [ ] **Step 2: Reload annotation when card changes**

After the existing `const startX = useRef(...)` line, add:

```ts
useEffect(() => {
  if (current) setAnnotation(getAnnotation(current.id));
}, [current?.id]);
```

- [ ] **Step 3: Add toggleStar and toggleReported functions**

After the `advance` function, add:

```ts
function toggleStar() {
  if (!current) return;
  const next = { ...annotation, starred: !annotation.starred };
  setAnnotation(next);
  saveAnnotation(current.id, next);
  setFlashDir("up");
  setTimeout(() => setFlashDir(null), 600);
}

function toggleReported() {
  if (!current) return;
  const next = { ...annotation, reported: !annotation.reported };
  setAnnotation(next);
  saveAnnotation(current.id, next);
  setFlashDir("down");
  setTimeout(() => setFlashDir(null), 600);
}
```

- [ ] **Step 4: Update the keyboard handler to include ↑↓**

Replace the existing `useEffect` keyboard handler:

```ts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") advance("mastered");
    if (e.key === "ArrowRight") advance("review");
    if (e.key === "ArrowUp") { e.preventDefault(); toggleStar(); }
    if (e.key === "ArrowDown") { e.preventDefault(); toggleReported(); }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [current, annotation]);
```

- [ ] **Step 5: Change h-screen to h-full**

Change the two occurrences of `h-screen` in the render to `h-full`:

Empty state div (when `!current`):
```tsx
<div class="flex flex-col items-center justify-center h-full bg-surface px-6 text-center">
```

Main wrapper div:
```tsx
<div class="flex flex-col h-full bg-surface select-none overflow-hidden">
```

- [ ] **Step 6: Add top and bottom indicators**

Inside the `<div class="relative flex-1 overflow-hidden">`, after the existing right indicator block and before the card div, add:

```tsx
{/* Top indicator: star */}
<div
  class="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none transition-all duration-200"
  style={{ opacity: flashDir === "up" ? 1 : annotation.starred ? 0.6 : 0.2 }}
>
  <div class="text-lg leading-none">{annotation.starred ? "⭐" : "☆"}</div>
  <div class="text-[9px] font-medium mt-0.5" style={{ color: annotation.starred ? "#d97706" : "#9b9b97" }}>
    ↑ {t("swipe.starLabel", lang)}
  </div>
</div>

{/* Bottom indicator: report */}
<div
  class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none transition-all duration-200"
  style={{ opacity: flashDir === "down" ? 1 : annotation.reported ? 0.6 : 0.2 }}
>
  <div class="text-lg leading-none">{annotation.reported ? "🚩" : "⚑"}</div>
  <div class="text-[9px] font-medium mt-0.5" style={{ color: annotation.reported ? "#ef4444" : "#9b9b97" }}>
    ↓ {t("swipe.reportLabel", lang)}
  </div>
</div>
```

- [ ] **Step 7: Replace 2-button bar with 4-button bar**

Replace the existing `<div class="flex gap-4 px-6 py-4 justify-center">` block entirely with:

```tsx
<div class="flex gap-2 px-4 py-3 justify-center">
  <button
    onClick={() => advance("mastered")}
    class="flex-1 py-2.5 rounded-xl bg-accent-green/10 text-accent-green font-medium text-sm active:scale-95 transition-transform flex flex-col items-center gap-0.5"
  >
    <span>✓ {t("swipe.masteredLabel", lang)}</span>
    <span class="text-[10px] opacity-40">←</span>
  </button>
  <button
    onClick={toggleStar}
    class={`flex-1 py-2.5 rounded-xl font-medium text-sm active:scale-95 transition-all flex flex-col items-center gap-0.5 ${annotation.starred ? "bg-yellow-100 text-yellow-600" : "bg-surface-muted text-slate"}`}
  >
    <span>{annotation.starred ? "⭐" : "☆"} {t("swipe.starLabel", lang)}</span>
    <span class="text-[10px] opacity-40">↑</span>
  </button>
  <button
    onClick={toggleReported}
    class={`flex-1 py-2.5 rounded-xl font-medium text-sm active:scale-95 transition-all flex flex-col items-center gap-0.5 ${annotation.reported ? "bg-red-100 text-red-500" : "bg-surface-muted text-slate"}`}
  >
    <span>{annotation.reported ? "🚩" : "⚑"} {t("swipe.reportLabel", lang)}</span>
    <span class="text-[10px] opacity-40">↓</span>
  </button>
  <button
    onClick={() => advance("review")}
    class="flex-1 py-2.5 rounded-xl bg-accent-orange/10 text-accent-orange font-medium text-sm active:scale-95 transition-transform flex flex-col items-center gap-0.5"
  >
    <span>{t("swipe.reviewLabel", lang)} ↻</span>
    <span class="text-[10px] opacity-40">→</span>
  </button>
</div>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/components/SwipeMode.tsx
git commit -m "feat: add star/report actions and keyboard ↑↓ to SwipeMode"
```

---

## Task 4: CollectionPage component

**Files:**
- Create: `site/src/components/CollectionPage.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from "preact/hooks";
import type { Card } from "../lib/types";
import { getAllAnnotations } from "../lib/annotations";
import { useLang, t, cardTitle } from "../lib/i18n";

const TYPE_COLORS: Record<string, string> = {
  fact: "bg-accent-blue",
  "problem-solution": "bg-accent-orange",
  "concept-model": "bg-purple-500",
  "how-to": "bg-accent-green",
  comparison: "bg-amber-500",
  architecture: "bg-cyan-500",
};

interface Props {
  cards: Card[];
  mode: "starred" | "reported";
}

export default function CollectionPage({ cards, mode }: Props) {
  const [lang] = useLang();
  const [annotations, setAnnotations] = useState<Record<string, any>>({});

  useEffect(() => {
    setAnnotations(getAllAnnotations());
  }, []);

  const filtered = cards.filter((c) => {
    const a = annotations[c.id];
    if (!a) return false;
    return mode === "starred" ? a.starred : a.reported;
  });

  const title = mode === "starred"
    ? t("collection.starred.title", lang)
    : t("collection.reported.title", lang);

  const emptyMsg = mode === "starred"
    ? t("collection.starred.empty", lang)
    : t("collection.reported.empty", lang);

  return (
    <div class="max-w-3xl mx-auto p-6">
      <h1 class="text-xl font-semibold mb-2">{title}</h1>
      {mode === "reported" && (
        <p class="text-sm text-slate mb-4">{t("collection.reported.desc", lang)}</p>
      )}
      {filtered.length === 0 ? (
        <div class="text-center text-slate py-16">{emptyMsg}</div>
      ) : (
        <div class="space-y-2 mt-4">
          {filtered.map((card) => (
            <a
              key={card.id}
              href={`/cards?card=${card.id}`}
              class="flex items-center gap-3 p-4 rounded-lg border border-surface-border bg-surface-raised hover:border-accent-orange transition-colors"
            >
              <span class={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[card.type] || "bg-slate"}`} />
              <span class="flex-1 text-sm font-medium">{cardTitle(card, lang)}</span>
              <span class="text-xs text-slate-light">{card.tags.slice(0, 2).join(", ")}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/components/CollectionPage.tsx
git commit -m "feat: add CollectionPage component for starred/reported lists"
```

---

## Task 5: New Astro pages

**Files:**
- Create: `site/src/pages/swipe.astro`
- Create: `site/src/pages/starred.astro`
- Create: `site/src/pages/reported.astro`
- Modify: `site/src/pages/cards.astro`
- Modify: `site/src/layouts/Base.astro`

- [ ] **Step 1: Extend activePage type in Base.astro**

In `site/src/layouts/Base.astro`, change:

```ts
interface Props {
  title: string;
  activePage: "cards" | "graph" | "notes";
}
```

to:

```ts
interface Props {
  title: string;
  activePage: "cards" | "graph" | "swipe" | "starred" | "reported";
}
```

- [ ] **Step 2: Wrap mobile SwipeMode in cards.astro with h-screen**

In `site/src/pages/cards.astro`, change:

```astro
{/* Mobile: swipe-only, no nav */}
<div class="block md:hidden">
  <SwipeMode client:load cards={cards} graph={graph} />
</div>
```

to:

```astro
{/* Mobile: swipe-only, no nav */}
<div class="block md:hidden h-screen">
  <SwipeMode client:load cards={cards} graph={graph} />
</div>
```

- [ ] **Step 3: Create swipe.astro**

```astro
---
import Base from "../layouts/Base.astro";
import SwipeMode from "../components/SwipeMode.tsx";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const cardsDir = join(process.cwd(), "../content/cards");
let cards = [];
try {
  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
  cards = files.map((f) => JSON.parse(readFileSync(join(cardsDir, f), "utf-8")));
} catch {}

const graphPath = join(process.cwd(), "../content/graph.json");
let graph = { nodes: [], edges: [] };
try {
  graph = JSON.parse(readFileSync(graphPath, "utf-8"));
} catch {}
---

<Base title="刷卡" activePage="swipe">
  <div class="h-[calc(100vh-49px)]">
    <SwipeMode client:load cards={cards} graph={graph} />
  </div>
</Base>
```

- [ ] **Step 4: Create starred.astro**

```astro
---
import Base from "../layouts/Base.astro";
import CollectionPage from "../components/CollectionPage.tsx";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const cardsDir = join(process.cwd(), "../content/cards");
let cards = [];
try {
  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
  cards = files.map((f) => JSON.parse(readFileSync(join(cardsDir, f), "utf-8")));
} catch {}
---

<Base title="收藏" activePage="starred">
  <CollectionPage client:load cards={cards} mode="starred" />
</Base>
```

- [ ] **Step 5: Create reported.astro**

```astro
---
import Base from "../layouts/Base.astro";
import CollectionPage from "../components/CollectionPage.tsx";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const cardsDir = join(process.cwd(), "../content/cards");
let cards = [];
try {
  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
  cards = files.map((f) => JSON.parse(readFileSync(join(cardsDir, f), "utf-8")));
} catch {}
---

<Base title="报错" activePage="reported">
  <CollectionPage client:load cards={cards} mode="reported" />
</Base>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/layouts/Base.astro site/src/pages/cards.astro site/src/pages/swipe.astro site/src/pages/starred.astro site/src/pages/reported.astro
git commit -m "feat: add /swipe, /starred, /reported pages"
```

---

## Task 6: Nav updates

**Files:**
- Modify: `site/src/components/NavLinks.tsx`
- Modify: `site/src/components/MobileNav.tsx`
- Modify: `site/src/pages/index.astro`

- [ ] **Step 1: Update NavLinks.tsx**

Replace the `items` array:

```tsx
const items = [
  { id: "cards", href: "/cards", key: "nav.cards" as const },
  { id: "graph", href: "/graph", key: "nav.graph" as const },
  { id: "swipe", href: "/swipe", key: "nav.swipe" as const },
  { id: "starred", href: "/starred", key: "nav.starred" as const },
  { id: "reported", href: "/reported", key: "nav.reported" as const },
];
```

- [ ] **Step 2: Update NavLinks.test.tsx**

In `site/src/components/NavLinks.test.tsx`, add one assertion to the first test:

```ts
expect(screen.getByRole("link", { name: "Swipe" })).toBeInTheDocument();
```

- [ ] **Step 3: Update MobileNav.tsx**

Replace the `items` array and the component's `activePage` type:

```tsx
const items = [
  { id: "cards", href: "/cards", icon: "📚", key: "nav.cards" as const },
  { id: "graph", href: "/graph", icon: "🗺️", key: "nav.graph" as const },
  { id: "swipe", href: "/swipe", icon: "⚡", key: "nav.swipe" as const },
];

export default function MobileNav({ activePage }: { activePage: "cards" | "graph" | "swipe" }) {
```

- [ ] **Step 4: Update index.astro nav**

In `site/src/pages/index.astro`, find the nav links block and replace:

```html
<a href="/cards" class="nav-link">Cards</a>
<a href="/graph" class="nav-link">Graph</a>
```

with:

```html
<a href="/cards" class="nav-link">Cards</a>
<a href="/graph" class="nav-link">Graph</a>
<a href="/swipe" class="nav-link">Swipe</a>
<a href="/starred" class="nav-link">⭐ Starred</a>
<a href="/reported" class="nav-link">🚩 Reported</a>
```

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC/site && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/zhaidewei/LEARN_ANTHROPIC
git add site/src/components/NavLinks.tsx site/src/components/NavLinks.test.tsx site/src/components/MobileNav.tsx site/src/pages/index.astro
git commit -m "feat: add swipe/starred/reported to nav; update MobileNav type"
```
