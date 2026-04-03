import { useState } from "preact/hooks";
import type { Card } from "../lib/types";
import { useLang, t } from "../lib/i18n";
import CardList from "./CardList";
import CardDetail from "./CardDetail";
import LangToggle from "./LangToggle";

function getCardIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("card");
}

export default function CardBrowser({ cards }: { cards: Card[] }) {
  const [lang] = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => {
      const fromUrl = getCardIdFromUrl();
      if (fromUrl && cards.some((c) => c.id === fromUrl)) return fromUrl;
      return cards[0]?.id || null;
    }
  );
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
