import type { Card } from "../lib/types";
import { useLang, cardTitle } from "../lib/i18n";

interface Props {
  groupMap: Map<string, Card[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedGroups: Set<string>;
  onToggleGroup: (group: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  fact: "bg-accent-blue",
  "problem-solution": "bg-accent-orange",
  "concept-model": "bg-purple-500",
  "how-to": "bg-accent-green",
  comparison: "bg-amber-500",
  architecture: "bg-cyan-500",
};

export default function CardList({ groupMap, selectedId, onSelect, expandedGroups, onToggleGroup }: Props) {
  const [lang] = useLang();
  const groups = [...groupMap.keys()];

  return (
    <div class="h-full flex flex-col border-r border-surface-border overflow-y-auto">
      {groups.map((group) => {
        const groupCards = groupMap.get(group)!;
        const isExpanded = expandedGroups.has(group);
        const hasSelected = groupCards.some((c) => c.id === selectedId);

        return (
          <div key={group}>
            {/* Group row */}
            <button
              onClick={() => onToggleGroup(group)}
              class={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-surface-border transition-colors hover:bg-surface-muted ${hasSelected && !isExpanded ? "bg-surface-raised" : ""}`}
            >
              <span class={`text-[10px] transition-transform duration-150 text-slate ${isExpanded ? "rotate-90" : ""}`}>▶</span>
              <span class={`flex-1 text-xs font-medium truncate ${hasSelected ? "text-accent-orange" : "text-charcoal"}`}>
                {group}
              </span>
              <span class="text-[11px] text-slate-light tabular-nums">{groupCards.length}</span>
            </button>

            {/* Card rows (expanded) */}
            {isExpanded && groupCards.map((card) => (
              <button
                key={card.id}
                onClick={() => onSelect(card.id)}
                class={`w-full flex items-start gap-2 pl-6 pr-3 py-2 border-b border-surface-border text-left transition-colors ${selectedId === card.id ? "bg-surface-raised border-l-2 border-l-accent-orange" : "hover:bg-surface-muted"}`}
              >
                <span class={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_COLORS[card.type] || "bg-slate"}`} />
                <span class="text-xs leading-snug text-charcoal">{cardTitle(card, lang)}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
