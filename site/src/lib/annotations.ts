import type { Annotation } from "./types";

const PREFIX = "annotations:";

const isBrowser = typeof localStorage !== "undefined";

export function getAnnotation(cardId: string): Annotation {
  if (!isBrowser) return { starred: false, comments: [], questions: [], reported: false };
  const raw = localStorage.getItem(PREFIX + cardId);
  if (!raw) return { starred: false, comments: [], questions: [], reported: false };
  const parsed = JSON.parse(raw);
  // backfill reported for annotations saved before this field existed
  return { reported: false, ...parsed };
}

export function saveAnnotation(cardId: string, annotation: Annotation) {
  if (!isBrowser) return;
  localStorage.setItem(PREFIX + cardId, JSON.stringify(annotation));
}

export function getAllAnnotations(): Record<string, Annotation> {
  const result: Record<string, Annotation> = {};
  if (!isBrowser) return result;
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
