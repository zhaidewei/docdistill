import type { Card } from "../lib/types";
import { useLang, t, cardTitle, cardBody, type Lang } from "../lib/i18n";
import FactCard from "./card-renderers/FactCard";
import ProblemSolutionCard from "./card-renderers/ProblemSolutionCard";
import ConceptModelCard from "./card-renderers/ConceptModelCard";
import HowToCard from "./card-renderers/HowToCard";
import ComparisonCard from "./card-renderers/ComparisonCard";
import ArchitectureCard from "./card-renderers/ArchitectureCard";

const TYPE_COLORS: Record<string, string> = {
  fact: "text-accent-blue",
  "problem-solution": "text-accent-orange",
  "concept-model": "text-purple-600",
  "how-to": "text-accent-green",
  comparison: "text-amber-600",
  architecture: "text-cyan-600",
};

function renderBody(card: Card, lang: Lang) {
  const body = cardBody(card, lang) as any;
  switch (card.type) {
    case "fact": return <FactCard body={body} lang={lang} />;
    case "problem-solution": return <ProblemSolutionCard body={body} lang={lang} />;
    case "concept-model": return <ConceptModelCard body={body} lang={lang} cardId={card.id} />;
    case "how-to": return <HowToCard body={body} lang={lang} />;
    case "comparison": return <ComparisonCard body={body} lang={lang} />;
    case "architecture": return <ArchitectureCard body={body} lang={lang} />;
  }
}

export default function CardDetail({ card }: { card: Card }) {
  const [lang] = useLang();

  return (
    <div class="h-full flex flex-col">
      <div class="p-5 border-b border-surface-border">
        <span class={`text-[11px] tracking-wider ${TYPE_COLORS[card.type] || "text-slate"}`}>
          {t(`type.${card.type}` as any, lang)}
        </span>
        <h2 class="text-lg font-medium mt-1">{cardTitle(card, lang)}</h2>
        <div class="text-xs text-slate-light mt-1">
          {card.readingMinutes} min · {card.tags.join(", ")} ·{" "}
          <a href={card.source} target="_blank" class="text-accent-orange hover:underline">{t("label.source", lang)}</a>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-5">{renderBody(card, lang)}</div>
    </div>
  );
}
