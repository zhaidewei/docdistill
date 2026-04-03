import { useState, useEffect } from "preact/hooks";
import { getAllAnnotations, exportToMarkdown } from "../lib/annotations";
import type { Annotation } from "../lib/types";
import { useLang, t, type Lang } from "../lib/i18n";
import LangToggle from "./LangToggle";

type Tab = "starred" | "comments" | "questions";

interface CardMeta {
  id: string;
  title: string;
  title_en?: string;
}

export default function NotesPage({ cards }: { cards: CardMeta[] }) {
  const [lang] = useLang();
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

  const tabs: { id: Tab; labelKey: "notes.starred" | "notes.comments" | "notes.questions"; icon: string }[] = [
    { id: "starred", labelKey: "notes.starred", icon: "⭐" },
    { id: "comments", labelKey: "notes.comments", icon: "💬" },
    { id: "questions", labelKey: "notes.questions", icon: "❓" },
  ];

  const emptyKeys: Record<Tab, "notes.empty.starred" | "notes.empty.comments" | "notes.empty.questions"> = {
    starred: "notes.empty.starred",
    comments: "notes.empty.comments",
    questions: "notes.empty.questions",
  };

  return (
    <div class="max-w-3xl mx-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex gap-1">
          {tabs.map((tabItem) => (
            <button key={tabItem.id} onClick={() => { setTab(tabItem.id); setSelected(new Set()); }}
              class={`px-4 py-2 rounded text-sm transition-colors ${tab === tabItem.id ? "bg-accent-orange text-white" : "bg-surface-raised text-gray-400 hover:text-gray-200"}`}>
              {tabItem.icon} {t(tabItem.labelKey, lang)}
            </button>
          ))}
        </div>
        <LangToggle />
      </div>

      <div class="flex items-center justify-between mb-4">
        <label class="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={filteredCards.length > 0 && selected.size === filteredCards.length} onChange={selectAll} class="rounded" />
          {t("notes.selectAll", lang)} ({filteredCards.length})
        </label>
        <button onClick={copyToClipboard}
          class="px-4 py-1.5 bg-accent-orange text-white rounded text-sm hover:bg-accent-orange/80 transition-colors">
          {copyFeedback ? t("notes.copied", lang) : `${t("notes.copy", lang)}${selected.size > 0 ? ` (${selected.size})` : ""}`}
        </button>
      </div>

      {filteredCards.length === 0 ? (
        <div class="text-center text-gray-500 py-16">
          {t(emptyKeys[tab], lang)}
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
                  <div class="font-medium text-sm">{(lang === "en" && card.title_en) ? card.title_en : card.title}</div>
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
