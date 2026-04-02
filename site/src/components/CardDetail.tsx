import { useState } from "preact/hooks";
import type { Card, Annotation } from "../lib/types";
import { getAnnotation, saveAnnotation } from "../lib/annotations";
import FactCard from "./card-renderers/FactCard";
import ProblemSolutionCard from "./card-renderers/ProblemSolutionCard";
import ConceptModelCard from "./card-renderers/ConceptModelCard";
import HowToCard from "./card-renderers/HowToCard";
import ComparisonCard from "./card-renderers/ComparisonCard";
import ArchitectureCard from "./card-renderers/ArchitectureCard";

const TYPE_LABELS: Record<string, string> = {
  fact: "FACT",
  "problem-solution": "PROBLEM → SOLUTION",
  "concept-model": "CONCEPT",
  "how-to": "HOW-TO",
  comparison: "COMPARISON",
  architecture: "ARCHITECTURE",
};

const TYPE_COLORS: Record<string, string> = {
  fact: "text-blue-400",
  "problem-solution": "text-accent-orange",
  "concept-model": "text-purple-400",
  "how-to": "text-accent-green",
  comparison: "text-yellow-400",
  architecture: "text-cyan-400",
};

function renderBody(card: Card) {
  switch (card.type) {
    case "fact": return <FactCard body={card.body as any} />;
    case "problem-solution": return <ProblemSolutionCard body={card.body as any} />;
    case "concept-model": return <ConceptModelCard body={card.body as any} />;
    case "how-to": return <HowToCard body={card.body as any} />;
    case "comparison": return <ComparisonCard body={card.body as any} />;
    case "architecture": return <ArchitectureCard body={card.body as any} />;
  }
}

export default function CardDetail({ card }: { card: Card }) {
  const [annotation, setAnnotation] = useState<Annotation>(() => getAnnotation(card.id));
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<"comment" | "question" | null>(null);

  function update(patch: Partial<Annotation>) {
    const next = { ...annotation, ...patch };
    setAnnotation(next);
    saveAnnotation(card.id, next);
  }

  function submitInput() {
    if (!input.trim() || !inputMode) return;
    if (inputMode === "comment") {
      update({ comments: [...annotation.comments, input.trim()] });
    } else {
      update({ questions: [...annotation.questions, input.trim()] });
    }
    setInput("");
    setInputMode(null);
  }

  return (
    <div class="h-full flex flex-col">
      <div class="p-5 border-b border-surface-border">
        <span class={`text-[11px] tracking-wider ${TYPE_COLORS[card.type] || "text-gray-400"}`}>
          {TYPE_LABELS[card.type] || card.type.toUpperCase()}
        </span>
        <h2 class="text-lg font-medium mt-1">{card.title}</h2>
        <div class="text-xs text-gray-500 mt-1">
          {card.readingMinutes} min · {card.tags.join(", ")} ·{" "}
          <a href={card.source} target="_blank" class="text-accent-orange hover:underline">来源</a>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-5">{renderBody(card)}</div>
      {(annotation.comments.length > 0 || annotation.questions.length > 0) && (
        <div class="px-5 pb-3 space-y-2">
          {annotation.comments.map((c, i) => (
            <div key={`c${i}`} class="text-xs bg-surface-raised p-2 rounded text-gray-400">💬 {c}</div>
          ))}
          {annotation.questions.map((q, i) => (
            <div key={`q${i}`} class="text-xs bg-surface-raised p-2 rounded text-yellow-400/70">❓ {q}</div>
          ))}
        </div>
      )}
      {inputMode && (
        <div class="px-5 pb-3 flex gap-2">
          <input type="text" value={input} onInput={(e) => setInput((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === "Enter" && submitInput()} placeholder={inputMode === "comment" ? "写笔记..." : "写问题..."} class="flex-1 bg-surface-raised border border-surface-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent-orange" autoFocus />
          <button onClick={submitInput} class="px-3 py-1.5 bg-accent-orange text-white rounded text-sm hover:bg-accent-orange/80">保存</button>
          <button onClick={() => { setInputMode(null); setInput(""); }} class="px-3 py-1.5 text-gray-400 text-sm hover:text-gray-200">取消</button>
        </div>
      )}
      <div class="flex gap-2 p-3 border-t border-surface-border">
        <button onClick={() => update({ starred: !annotation.starred })} class={`px-3 py-1.5 rounded text-sm transition-colors ${annotation.starred ? "bg-yellow-500/20 text-yellow-400" : "bg-surface-raised text-gray-400 hover:text-gray-200"}`}>⭐ 标记</button>
        <button onClick={() => setInputMode("comment")} class="px-3 py-1.5 rounded text-sm bg-surface-raised text-gray-400 hover:text-gray-200">💬 Comment</button>
        <button onClick={() => setInputMode("question")} class="px-3 py-1.5 rounded text-sm bg-surface-raised text-gray-400 hover:text-gray-200">❓ 提问</button>
      </div>
    </div>
  );
}
