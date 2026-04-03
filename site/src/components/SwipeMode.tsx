import { useState, useRef, useEffect } from "preact/hooks";
import type { Card, Graph } from "../lib/types";
import { pickNextCard, setSwipeStatus, getSwipeStats } from "../lib/swipe";
import { useLang, t, cardTitle, cardBody, type Lang } from "../lib/i18n";
import { getAnnotation, saveAnnotation } from "../lib/annotations";
import type { Annotation } from "../lib/types";
import LangToggle from "./LangToggle";
import FactCard from "./card-renderers/FactCard";
import ProblemSolutionCard from "./card-renderers/ProblemSolutionCard";
import ConceptModelCard from "./card-renderers/ConceptModelCard";
import HowToCard from "./card-renderers/HowToCard";
import ComparisonCard from "./card-renderers/ComparisonCard";
import ArchitectureCard from "./card-renderers/ArchitectureCard";

const TYPE_COLORS: Record<string, string> = {
  fact: "#4a7fb5",
  "problem-solution": "#d97757",
  "concept-model": "#9333ea",
  "how-to": "#22c55e",
  comparison: "#d97706",
  architecture: "#0891b2",
};

export default function SwipeMode({ cards, graph }: { cards: Card[]; graph: Graph }) {
  const [lang] = useLang();
  const [current, setCurrent] = useState<Card | null>(() => pickNextCard(cards, graph, null));
  const [lastId, setLastId] = useState<string | null>(null);
  const [stats, setStats] = useState(() => getSwipeStats(cards));
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [annotation, setAnnotation] = useState<Annotation>(() =>
    current ? getAnnotation(current.id) : { starred: false, reported: false, comments: [], questions: [] }
  );
  const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (current) setAnnotation(getAnnotation(current.id));
  }, [current?.id]);

  function renderBody(card: Card, lang: Lang) {
    const body = cardBody(card, lang) as any;
    switch (card.type) {
      case "fact": return <FactCard body={body} lang={lang} />;
      case "problem-solution": return <ProblemSolutionCard body={body} lang={lang} />;
      case "concept-model": return <ConceptModelCard body={body} lang={lang} />;
      case "how-to": return <HowToCard body={body} lang={lang} />;
      case "comparison": return <ComparisonCard body={body} lang={lang} />;
      case "architecture": return <ArchitectureCard body={body} lang={lang} />;
    }
  }

  function advance(status: "mastered" | "review") {
    if (!current) return;
    setSwipeStatus(current.id, status);
    setSwipeDir(status === "mastered" ? "left" : "right");

    setTimeout(() => {
      const next = pickNextCard(cards, graph, current.id, current.id);
      setLastId(current.id);
      setCurrent(next);
      setStats(getSwipeStats(cards));
      setSwipeDir(null);
      setOffsetX(0);
    }, 300);
  }

  function toggleStar() {
    if (!current) return;
    const next = { ...annotation, starred: !annotation.starred };
    setAnnotation(next);
    saveAnnotation(current.id, next);
    setFlashDir("up");
    setTimeout(() => setFlashDir(null), 600);
  }

  function toggleReported() {
    if (!current) return;
    const next = { ...annotation, reported: !annotation.reported };
    setAnnotation(next);
    saveAnnotation(current.id, next);
    setFlashDir("down");
    setTimeout(() => setFlashDir(null), 600);
  }

  // Touch handlers
  function onTouchStart(e: TouchEvent) {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function onTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffsetX(dx);
  }

  function onTouchEnd() {
    setIsDragging(false);
    if (Math.abs(offsetX) > 80) {
      // Left swipe = mastered, Right swipe = review
      advance(offsetX < 0 ? "mastered" : "review");
    } else {
      setOffsetX(0);
    }
  }

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") advance("mastered");
      if (e.key === "ArrowRight") advance("review");
      if (e.key === "ArrowUp") { e.preventDefault(); toggleStar(); }
      if (e.key === "ArrowDown") { e.preventDefault(); toggleReported(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, annotation]);

  const total = cards.length;
  const progress = total > 0 ? ((stats.mastered / total) * 100) : 0;

  // Swipe visual feedback
  const rotation = offsetX * 0.05;
  const opacity = Math.max(0, 1 - Math.abs(offsetX) / 300);
  const swipeStyle = swipeDir === "left"
    ? { transform: "translateX(-120vw) rotate(-15deg)", opacity: 0, transition: "all 0.3s ease-out" }
    : swipeDir === "right"
    ? { transform: "translateX(120vw) rotate(15deg)", opacity: 0, transition: "all 0.3s ease-out" }
    : isDragging
    ? { transform: `translateX(${offsetX}px) rotate(${rotation}deg)`, transition: "none" }
    : { transform: "translateX(0) rotate(0)", transition: "all 0.2s ease-out" };

  // Indicator color based on drag direction
  const indicatorLeft = offsetX < -30 ? Math.min(1, (Math.abs(offsetX) - 30) / 50) : 0;
  const indicatorRight = offsetX > 30 ? Math.min(1, (offsetX - 30) / 50) : 0;

  if (!current) {
    return (
      <div class="flex flex-col items-center justify-center h-full bg-surface px-6 text-center">
        <div class="text-4xl mb-4">🎉</div>
        <div class="text-xl font-medium mb-2 text-charcoal">{t("swipe.allDone", lang)}</div>
        <div class="text-slate-light text-sm mb-6">
          {stats.mastered} {t("swipe.allDoneDesc", lang)}
          {stats.review > 0 && `，${stats.review} ${t("swipe.reviewPending", lang)}`}
        </div>
        {stats.review > 0 && (
          <button
            onClick={() => {
              // Reset review cards to unseen for another round
              for (const card of cards) {
                const s = localStorage.getItem(`swipe:${card.id}`);
                if (s) {
                  const rec = JSON.parse(s);
                  if (rec.status === "review") {
                    setSwipeStatus(card.id, "unseen" as any);
                  }
                }
              }
              setStats(getSwipeStats(cards));
              setCurrent(pickNextCard(cards, graph, null));
            }}
            class="px-6 py-3 bg-accent-orange text-white rounded-lg text-sm"
          >
            {t("swipe.startReview", lang)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div class="flex flex-col h-full bg-surface overflow-hidden">
      {/* Header */}
      <div class="px-4 pt-4 pb-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-accent-orange font-bold text-sm">Doc Distill</span>
          <div class="flex items-center gap-3">
            <span class="text-slate-light text-xs">
              {stats.mastered}/{total} {t("swipe.progress", lang)}
            </span>
            <LangToggle />
          </div>
        </div>
        {/* Progress bar */}
        <div class="h-1 bg-surface-raised rounded-full overflow-hidden">
          <div
            class="h-full bg-accent-orange rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Swipe indicators */}
      <div class="relative flex-1 overflow-hidden">
        {/* Top indicator: star */}
        <div
          class="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none transition-all duration-200"
          style={{ opacity: flashDir === "up" ? 1 : annotation.starred ? 0.6 : 0.2 }}
        >
          <div class="text-lg leading-none">{annotation.starred ? "⭐" : "☆"}</div>
          <div class="text-[9px] font-medium mt-0.5" style={{ color: annotation.starred ? "#d97706" : "#9b9b97" }}>
            ↑ {t("swipe.starLabel", lang)}
          </div>
        </div>

        {/* Bottom indicator: report */}
        <div
          class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none transition-all duration-200"
          style={{ opacity: flashDir === "down" ? 1 : annotation.reported ? 0.6 : 0.2 }}
        >
          <div class="text-lg leading-none">{annotation.reported ? "🚩" : "⚑"}</div>
          <div class="text-[9px] font-medium mt-0.5" style={{ color: annotation.reported ? "#ef4444" : "#9b9b97" }}>
            ↓ {t("swipe.reportLabel", lang)}
          </div>
        </div>

        {/* Left indicator: mastered */}
        <div
          class="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-center pointer-events-none transition-opacity"
          style={{ opacity: indicatorLeft }}
        >
          <div class="text-2xl">✓</div>
          <div class="text-xs text-accent-green font-medium">{t("swipe.masteredLabel", lang)}</div>
        </div>

        {/* Right indicator: review */}
        <div
          class="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-center pointer-events-none transition-opacity"
          style={{ opacity: indicatorRight }}
        >
          <div class="text-2xl">↻</div>
          <div class="text-xs text-accent-orange font-medium">{t("swipe.reviewLabel", lang)}</div>
        </div>

        {/* Card */}
        <div
          ref={cardRef}
          class="absolute inset-3 bg-surface-raised rounded-2xl border border-surface-border overflow-hidden flex flex-col select-none"
          style={swipeStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Card type badge */}
          <div class="px-5 pt-5 pb-3">
            <div class="flex items-center gap-2 mb-2">
              <span
                class="text-[10px] tracking-wider font-medium px-2 py-0.5 rounded"
                style={{
                  color: TYPE_COLORS[current.type] || "#9ca3af",
                  backgroundColor: (TYPE_COLORS[current.type] || "#9ca3af") + "12",
                }}
              >
                {t(`type.${current.type}` as any, lang)}
              </span>
              <span class="text-slate text-[10px]">{current.readingMinutes} min</span>
            </div>
            <h2 class="text-lg font-medium leading-snug">{cardTitle(current, lang)}</h2>
            <div class="flex gap-1 mt-2">
              {current.tags.map((tag) => (
                <span key={tag} class="text-[10px] text-slate bg-surface-muted px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Card body - scrollable */}
          <div class="flex-1 overflow-y-auto px-5 pb-5 select-text">
            {renderBody(current, lang)}
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div class="flex gap-2 px-4 py-3 justify-center">
        <button
          onClick={() => advance("mastered")}
          class="flex-1 py-2.5 rounded-xl bg-accent-green/10 text-accent-green font-medium text-sm active:scale-95 transition-transform flex flex-col items-center gap-0.5"
        >
          <span>✓ {t("swipe.masteredLabel", lang)}</span>
          <span class="text-[10px] opacity-40">←</span>
        </button>
        <button
          onClick={toggleStar}
          class={`flex-1 py-2.5 rounded-xl font-medium text-sm active:scale-95 transition-all flex flex-col items-center gap-0.5 ${annotation.starred ? "bg-yellow-100 text-yellow-600" : "bg-surface-muted text-slate"}`}
        >
          <span>{annotation.starred ? "⭐" : "☆"} {t("swipe.starLabel", lang)}</span>
          <span class="text-[10px] opacity-40">↑</span>
        </button>
        <button
          onClick={toggleReported}
          class={`flex-1 py-2.5 rounded-xl font-medium text-sm active:scale-95 transition-all flex flex-col items-center gap-0.5 ${annotation.reported ? "bg-red-100 text-red-500" : "bg-surface-muted text-slate"}`}
        >
          <span>{annotation.reported ? "🚩" : "⚑"} {t("swipe.reportLabel", lang)}</span>
          <span class="text-[10px] opacity-40">↓</span>
        </button>
        <button
          onClick={() => advance("review")}
          class="flex-1 py-2.5 rounded-xl bg-accent-orange/10 text-accent-orange font-medium text-sm active:scale-95 transition-transform flex flex-col items-center gap-0.5"
        >
          <span>{t("swipe.reviewLabel", lang)} ↻</span>
          <span class="text-[10px] opacity-40">→</span>
        </button>
      </div>
    </div>
  );
}
