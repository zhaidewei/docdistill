import { useState, useEffect } from "preact/hooks";
import type { Card, Annotation } from "../lib/types";
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
  const [annotations, setAnnotations] = useState<Record<string, Annotation>>({});

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
