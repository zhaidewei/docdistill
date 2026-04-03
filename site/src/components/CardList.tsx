import type { Card } from "../lib/types";
import { useLang, t, cardTitle } from "../lib/i18n";

interface Props {
  cards: Card[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  fact: "text-accent-blue",
  "problem-solution": "text-accent-orange",
  "concept-model": "text-purple-600",
  "how-to": "text-accent-green",
  comparison: "text-amber-600",
  architecture: "text-cyan-600",
};

export default function CardList({ cards, selectedId, onSelect, filter, onFilterChange }: Props) {
  const [lang] = useLang();
  const allTags = [...new Set(cards.flatMap((c) => c.tags))].sort();
  const filtered = filter ? cards.filter((c) => c.tags.includes(filter)) : cards;

  return (
    <div class="h-full flex flex-col border-r border-surface-border">
      <div class="p-3 border-b border-surface-border space-y-2">
        <div class="flex gap-1 flex-wrap">
          <button onClick={() => onFilterChange("")} class={`px-2 py-0.5 rounded text-xs transition-colors ${!filter ? "bg-accent-orange text-white" : "bg-surface-muted text-slate hover:text-charcoal"}`}>
            {t("browser.all", lang)} ({cards.length})
          </button>
          {allTags.map((tag) => (
            <button key={tag} onClick={() => onFilterChange(tag)} class={`px-2 py-0.5 rounded text-xs transition-colors ${filter === tag ? "bg-accent-orange text-white" : "bg-surface-muted text-slate hover:text-charcoal"}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        {filtered.map((card) => (
          <button key={card.id} onClick={() => onSelect(card.id)} class={`w-full text-left p-3 border-b border-surface-border transition-colors ${selectedId === card.id ? "bg-surface-raised border-l-2 border-l-accent-orange" : "hover:bg-surface-muted"}`}>
            <span class={`text-[11px] tracking-wider ${TYPE_COLORS[card.type] || "text-slate"}`}>{t(`type.${card.type}` as any, lang)}</span>
            <div class="text-sm mt-1">{cardTitle(card, lang)}</div>
            <div class="text-xs text-slate-light mt-1">{card.readingMinutes} min · {card.tags.join(", ")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
