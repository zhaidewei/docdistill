import { useState, useEffect } from "preact/hooks";
import { getAllAnnotations, exportToMarkdown } from "../lib/annotations";
import type { Annotation } from "../lib/types";

type Tab = "starred" | "comments" | "questions";

interface CardMeta {
  id: string;
  title: string;
}

export default function NotesPage({ cards }: { cards: CardMeta[] }) {
  const [tab, setTab] = useState<Tab>("starred");
  const [annotations, setAnnotations] = useState<Record<string, Annotation>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    setAnnotations(getAllAnnotations());
  }, []);

  const filteredCards = cards.filter((c) => {
    const a = annotations[c.id];
    if (!a) return false;
    if (tab === "starred") return a.starred;
    if (tab === "comments") return a.comments.length > 0;
    return a.questions.length > 0;
  });

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === filteredCards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredCards.map((c) => c.id)));
    }
  }

  async function copyToClipboard() {
    const toExport = selected.size > 0 ? cards.filter((c) => selected.has(c.id)) : filteredCards;
    const md = exportToMarkdown(toExport, annotations, tab);
    await navigator.clipboard.writeText(md);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "starred", label: "收藏", icon: "⭐" },
    { id: "comments", label: "笔记", icon: "💬" },
    { id: "questions", label: "问题", icon: "❓" },
  ];

  return (
    <div class="max-w-3xl mx-auto p-6">
      <div class="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(new Set()); }}
            class={`px-4 py-2 rounded text-sm transition-colors ${tab === t.id ? "bg-accent-orange text-white" : "bg-surface-raised text-gray-400 hover:text-gray-200"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div class="flex items-center justify-between mb-4">
        <label class="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={filteredCards.length > 0 && selected.size === filteredCards.length} onChange={selectAll} class="rounded" />
          全选 ({filteredCards.length})
        </label>
        <button onClick={copyToClipboard}
          class="px-4 py-1.5 bg-accent-orange text-white rounded text-sm hover:bg-accent-orange/80 transition-colors">
          {copyFeedback ? "✓ 已复制" : `📋 复制到剪贴板${selected.size > 0 ? ` (${selected.size})` : ""}`}
        </button>
      </div>

      {filteredCards.length === 0 ? (
        <div class="text-center text-gray-500 py-16">
          还没有{tabs.find((t) => t.id === tab)?.label}
        </div>
      ) : (
        <div class="space-y-2">
          {filteredCards.map((card) => {
            const a = annotations[card.id];
            return (
              <div key={card.id}
                class={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${selected.has(card.id) ? "border-accent-orange bg-accent-orange/5" : "border-surface-border bg-surface-raised"}`}>
                <input type="checkbox" checked={selected.has(card.id)} onChange={() => toggleSelect(card.id)} class="mt-1 rounded" />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{card.title}</div>
                  {tab === "comments" && a.comments.map((c, i) => (
                    <div key={i} class="text-xs text-gray-400 mt-1">💬 {c}</div>
                  ))}
                  {tab === "questions" && a.questions.map((q, i) => (
                    <div key={i} class="text-xs text-yellow-400/70 mt-1">❓ {q}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
