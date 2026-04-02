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

export default function CardList({ cards, selectedId, onSelect, filter, onFilterChange }: Props) {
  const allTags = [...new Set(cards.flatMap((c) => c.tags))].sort();
  const filtered = filter ? cards.filter((c) => c.tags.includes(filter)) : cards;

  return (
    <div class="h-full flex flex-col border-r border-surface-border">
      <div class="p-3 border-b border-surface-border space-y-2">
        <div class="flex gap-1 flex-wrap">
          <button onClick={() => onFilterChange("")} class={`px-2 py-0.5 rounded text-xs transition-colors ${!filter ? "bg-accent-orange text-white" : "bg-surface-raised text-gray-400 hover:text-gray-200"}`}>
            全部 ({cards.length})
          </button>
          {allTags.map((tag) => (
            <button key={tag} onClick={() => onFilterChange(tag)} class={`px-2 py-0.5 rounded text-xs transition-colors ${filter === tag ? "bg-accent-orange text-white" : "bg-surface-raised text-gray-400 hover:text-gray-200"}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        {filtered.map((card) => (
          <button key={card.id} onClick={() => onSelect(card.id)} class={`w-full text-left p-3 border-b border-surface-border transition-colors ${selectedId === card.id ? "bg-surface-raised border-l-2 border-l-accent-orange" : "hover:bg-surface-raised/50"}`}>
            <span class={`text-[11px] tracking-wider ${TYPE_COLORS[card.type] || "text-gray-400"}`}>{TYPE_LABELS[card.type] || card.type.toUpperCase()}</span>
            <div class="text-sm mt-1">{card.title}</div>
            <div class="text-xs text-gray-500 mt-1">{card.readingMinutes} min · {card.tags.join(", ")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
