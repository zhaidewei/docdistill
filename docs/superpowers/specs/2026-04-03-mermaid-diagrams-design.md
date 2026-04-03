# Mermaid Diagrams for Concept Cards — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Goal

Replace the plain-text `visual` fields in `concept-model` cards with real flowchart diagrams, rendered as SVG at build time via Mermaid.

## Background

33 out of 117 cards are `concept-model` type. Each has a `body.visual` and `body_en.visual` field containing a text description of a flowchart (using `→`, `[...]`, conditional notation). Currently rendered as italic text. The goal is to render these as actual diagrams.

## Data Schema

### Change

Add a top-level `diagram` field (Mermaid syntax, English only) to `concept-model` cards. Remove `body.visual` and `body_en.visual`.

**Before:**
```json
{
  "body": {
    "concept": "...",
    "analogy": "...",
    "visual": "请求 → Claude 评估复杂度 → [简单：直接回答 | 复杂：深度思考后回答] → 响应"
  },
  "body_en": {
    "concept": "...",
    "analogy": "...",
    "visual": "Request → Claude evaluates complexity → [Simple: answer directly | Complex: deep thinking then answer] → Response"
  }
}
```

**After:**
```json
{
  "diagram": "flowchart LR\n  A[Request] --> B{Complexity?}\n  B -->|Simple| C[Answer directly]\n  B -->|Complex| D[Deep thinking] --> E[Response]",
  "body": {
    "concept": "...",
    "analogy": "..."
  },
  "body_en": {
    "concept": "...",
    "analogy": "..."
  }
}
```

### Rationale

- `diagram` is language-agnostic (English labels, shown in both zh/en modes)
- Keeps `body`/`body_en` structures clean and symmetric
- One SVG per card (33 total) instead of 66

## Batch Conversion

Use Claude API to convert all 33 cards' `visual_en` text descriptions into valid Mermaid `flowchart LR` syntax. Run as a one-time script (`scripts/convert-visuals-to-mermaid.js`) that:

1. Reads each card JSON with a `body_en.visual` field
2. Calls Claude to generate Mermaid syntax from the text description
3. Writes `diagram` field and removes `body.visual` / `body_en.visual`
4. Saves updated JSON in-place

## Build Script

**File:** `scripts/generate-diagrams.js`

**Dependencies:** Add `@mermaid-js/mermaid-isomorphic` to devDependencies. Uses `@playwright/test` (already installed) as the browser backend.

**Behavior:**
1. Read all `content/cards/*.json`
2. For each card with a `diagram` field, render SVG using `@mermaid-js/mermaid-isomorphic`
3. Apply consistent theme (neutral, matches site's color palette)
4. Write to `site/public/diagrams/{card-id}.svg`
5. Skip cards without `diagram` field

**When to run:** Manually when `diagram` fields are added or changed. SVG output is committed to git so no script run is needed for normal builds or local dev.

## TypeScript Types

**`site/src/lib/types.ts`:**
- Add `diagram?: string` to `Card` interface
- Remove `visual` from `ConceptModelBody`

## Component Changes

**`site/src/components/card-renderers/ConceptModelCard.tsx`:**
- Add `cardId?: string` to props
- If `cardId` is provided: render `<img src={/diagrams/${cardId}.svg} alt="diagram" class="w-full rounded" />`
- If no `cardId`: render nothing in place of the old visual block (no fallback text needed since all 33 cards will have SVGs)

**`site/src/components/SwipeMode.tsx`:**
- Pass `cardId={card.id}` to `<ConceptModelCard>`

**`site/src/components/CardDetail.tsx`:**
- Pass `cardId={card.id}` to `<ConceptModelCard>`

## Files Changed

| File | Change |
|------|--------|
| `content/cards/*.json` (33 files) | Add `diagram`, remove `body.visual` + `body_en.visual` |
| `scripts/convert-visuals-to-mermaid.js` | One-time conversion script |
| `scripts/generate-diagrams.js` | Build-time SVG generation |
| `site/src/lib/types.ts` | `diagram?: string` on `Card`; remove `visual` from `ConceptModelBody` |
| `site/src/components/card-renderers/ConceptModelCard.tsx` | Add `cardId` prop, render `<img>` |
| `site/src/components/SwipeMode.tsx` | Pass `cardId` |
| `site/src/components/CardDetail.tsx` | Pass `cardId` |
| `site/public/diagrams/` | Generated SVG files (committed to git; regenerate by running the script after editing diagrams) |

## Out of Scope

- Other card types (fact, how-to, etc.) — none have `visual` fields
- Interactive/animated diagrams
- Dark mode diagram variants
- i18n diagram labels
