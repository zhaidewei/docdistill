import { useState } from "preact/hooks";
import type { Card } from "../lib/types";
import CardList from "./CardList";
import CardDetail from "./CardDetail";

export default function CardBrowser({ cards }: { cards: Card[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(cards[0]?.id || null);
  const [filter, setFilter] = useState("");
  const selectedCard = cards.find((c) => c.id === selectedId) || null;

  return (
    <div class="flex h-[calc(100vh-49px)]">
      <div class="w-[320px] shrink-0">
        <CardList cards={cards} selectedId={selectedId} onSelect={setSelectedId} filter={filter} onFilterChange={setFilter} />
      </div>
      <div class="flex-1">
        {selectedCard ? (
          <CardDetail key={selectedCard.id} card={selectedCard} />
        ) : (
          <div class="flex items-center justify-center h-full text-gray-500">选择一张卡片开始阅读</div>
        )}
      </div>
    </div>
  );
}
