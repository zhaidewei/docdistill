import { useState } from "preact/hooks";
import type { Card, Graph } from "../lib/types";
import { useLang, t } from "../lib/i18n";
import CardList from "./CardList";
import CardDetail from "./CardDetail";
import LangToggle from "./LangToggle";

function getCardIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("card");
}

function buildGroupMap(cards: Card[], graph: Graph): Map<string, Card[]> {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const groupMap = new Map<string, Card[]>();

  for (const node of graph.nodes) {
    const card = cardMap.get(node.id);
    if (!card) continue;
    if (!groupMap.has(node.group)) groupMap.set(node.group, []);
    groupMap.get(node.group)!.push(card);
  }

  const mappedIds = new Set(graph.nodes.map((n) => n.id));
  const unmapped = cards.filter((c) => !mappedIds.has(c.id));
  if (unmapped.length) groupMap.set("other", unmapped);

  return groupMap;
}

export default function CardBrowser({ cards, graph }: { cards: Card[]; graph: Graph }) {
  const [lang] = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const fromUrl = getCardIdFromUrl();
    if (fromUrl && cards.some((c) => c.id === fromUrl)) return fromUrl;
    return cards[0]?.id || null;
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand the group containing the initially selected card
    if (!selectedId) return new Set();
    const node = graph.nodes.find((n) => n.id === selectedId);
    return node ? new Set([node.group]) : new Set();
  });

  const groupMap = buildGroupMap(cards, graph);
  const selectedCard = cards.find((c) => c.id === selectedId) || null;

  function handleToggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    // Ensure the group containing this card is expanded
    const node = graph.nodes.find((n) => n.id === id);
    if (node) {
      setExpandedGroups((prev) => {
        if (prev.has(node.group)) return prev;
        return new Set([...prev, node.group]);
      });
    }
  }

  return (
    <div class="flex h-[calc(100vh-49px)]">
      <div class="w-[280px] shrink-0">
        <CardList
          groupMap={groupMap}
          selectedId={selectedId}
          onSelect={handleSelect}
          expandedGroups={expandedGroups}
          onToggleGroup={handleToggleGroup}
        />
      </div>
      <div class="flex-1">
        {selectedCard ? (
          <CardDetail key={selectedCard.id} card={selectedCard} />
        ) : (
          <div class="flex flex-col items-center justify-center h-full gap-4">
            <div class="absolute top-4 right-4">
              <LangToggle />
            </div>
            <div class="text-slate">{t("browser.select", lang)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
