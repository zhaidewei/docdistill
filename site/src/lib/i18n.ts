import { useState, useEffect } from "preact/hooks";

const isBrowser = typeof localStorage !== "undefined";
const LANG_KEY = "lang";

export type Lang = "zh" | "en";

export function getLang(): Lang {
  if (!isBrowser) return "zh";
  return (localStorage.getItem(LANG_KEY) as Lang) || "zh";
}

export function setLang(lang: Lang) {
  if (!isBrowser) return;
  localStorage.setItem(LANG_KEY, lang);
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(getLang());

  useEffect(() => {
    function onLangChange() { setLangState(getLang()); }
    window.addEventListener("langchange", onLangChange);
    return () => window.removeEventListener("langchange", onLangChange);
  }, []);

  function changeLang(l: Lang) {
    setLang(l);
    setLangState(l);
    window.dispatchEvent(new Event("langchange"));
  }

  return [lang, changeLang];
}

const strings = {
  // Nav
  "nav.cards": { zh: "卡片", en: "Cards" },
  "nav.graph": { zh: "图谱", en: "Graph" },
  "nav.notes": { zh: "笔记", en: "Notes" },
  "nav.swipe": { zh: "刷卡", en: "Swipe" },
  "nav.starred": { zh: "⭐ 收藏", en: "⭐ Starred" },
  "nav.reported": { zh: "🚩 报错", en: "🚩 Reported" },

  // Card types
  "type.fact": { zh: "事实", en: "FACT" },
  "type.problem-solution": { zh: "问题 → 方案", en: "PROBLEM → SOLUTION" },
  "type.concept-model": { zh: "概念", en: "CONCEPT" },
  "type.how-to": { zh: "步骤", en: "HOW-TO" },
  "type.comparison": { zh: "对比", en: "COMPARISON" },
  "type.architecture": { zh: "架构", en: "ARCHITECTURE" },

  // Card body labels
  "label.fact": { zh: "事实", en: "FACT" },
  "label.context": { zh: "背景", en: "CONTEXT" },
  "label.problem": { zh: "问题", en: "PROBLEM" },
  "label.solution": { zh: "方案", en: "SOLUTION" },
  "label.takeaway": { zh: "💡 关键收获", en: "💡 KEY TAKEAWAY" },
  "label.concept": { zh: "概念", en: "CONCEPT" },
  "label.analogy": { zh: "🧠 类比", en: "🧠 ANALOGY" },
  "label.visual": { zh: "📐 图示", en: "📐 VISUAL" },
  "label.goal": { zh: "目标", en: "GOAL" },
  "label.overview": { zh: "概览", en: "OVERVIEW" },
  "label.flow": { zh: "🔄 流程", en: "🔄 FLOW" },
  "label.source": { zh: "来源", en: "Source" },

  // Card browser
  "browser.all": { zh: "全部", en: "All" },
  "browser.select": { zh: "选择一张卡片开始阅读", en: "Select a card to start reading" },
  "browser.min": { zh: "分钟", en: "min" },

  // Annotations
  "anno.star": { zh: "⭐ 标记", en: "⭐ Star" },
  "anno.comment": { zh: "💬 笔记", en: "💬 Note" },
  "anno.question": { zh: "❓ 提问", en: "❓ Question" },
  "anno.save": { zh: "保存", en: "Save" },
  "anno.cancel": { zh: "取消", en: "Cancel" },
  "anno.writeNote": { zh: "写笔记...", en: "Write a note..." },
  "anno.writeQuestion": { zh: "写问题...", en: "Write a question..." },

  // Swipe mode
  "swipe.mastered": { zh: "← 掌握了", en: "← Got it" },
  "swipe.review": { zh: "再看看 →", en: "Review →" },
  "swipe.masteredLabel": { zh: "掌握", en: "Got it" },
  "swipe.reviewLabel": { zh: "再看", en: "Review" },
  "swipe.progress": { zh: "已掌握", en: "mastered" },
  "swipe.allDone": { zh: "全部掌握！", en: "All done!" },
  "swipe.allDoneDesc": { zh: "张卡片已掌握", en: "cards mastered" },
  "swipe.reviewPending": { zh: "张待复习", en: "to review" },
  "swipe.startReview": { zh: "复习待复习的卡片", en: "Review pending cards" },
  "swipe.starLabel": { zh: "收藏", en: "Star" },
  "swipe.reportLabel": { zh: "报错", en: "Report" },

  // Notes page
  "notes.starred": { zh: "收藏", en: "Starred" },
  "notes.comments": { zh: "笔记", en: "Notes" },
  "notes.questions": { zh: "问题", en: "Questions" },
  "notes.selectAll": { zh: "全选", en: "Select all" },
  "notes.copy": { zh: "📋 复制到剪贴板", en: "📋 Copy to clipboard" },
  "notes.copied": { zh: "✓ 已复制", en: "✓ Copied" },
  "notes.empty.starred": { zh: "还没有收藏", en: "No starred cards" },
  "notes.empty.comments": { zh: "还没有笔记", en: "No notes yet" },
  "notes.empty.questions": { zh: "还没有问题", en: "No questions yet" },

  // Graph
  "graph.selectedNode": { zh: "选中节点", en: "SELECTED NODE" },
  "graph.cards": { zh: "张卡片", en: "cards" },
  "graph.requires": { zh: "需要先了解", en: "Requires" },
  "graph.extends": { zh: "延伸", en: "Extends" },
  "graph.viewCards": { zh: "查看相关卡片 →", en: "View related cards →" },

  // Progress bar
  "progress.mastered": { zh: "已掌握", en: "mastered" },

  // Homepage dashboard
  "home.progress.title": { zh: "学习进度", en: "Learning Progress" },
  "home.progress.continue": { zh: "继续学习", en: "Continue" },
  "home.progress.start": { zh: "开始学习", en: "Start Learning" },
  "home.progress.mastered": { zh: "已掌握", en: "mastered" },
  "home.progress.review": { zh: "待复习", en: "to review" },
  "home.progress.unseen": { zh: "未学习", en: "unseen" },
  "home.progress.allDone": { zh: "全部掌握！去复习巩固吧", en: "All done! Time to review." },

  // Collection pages
  "collection.starred.title": { zh: "我的收藏", en: "Starred Cards" },
  "collection.starred.empty": { zh: "还没有收藏的卡片", en: "No starred cards yet" },
  "collection.reported.title": { zh: "报错卡片", en: "Reported Cards" },
  "collection.reported.empty": { zh: "没有报错记录", en: "No reported cards" },
  "collection.reported.desc": { zh: "以下卡片被标记为内容有误，供核查", en: "These cards have been flagged as potentially incorrect." },
} as const;

// Helper to pick localized card content
import type { Card, CardBody } from "./types";

export function cardTitle(card: Card, lang?: Lang): string {
  const l = lang || getLang();
  return (l === "en" && card.title_en) ? card.title_en : card.title;
}

export function cardBody(card: Card, lang?: Lang): CardBody {
  const l = lang || getLang();
  return (l === "en" && card.body_en) ? card.body_en : card.body;
}

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang?: Lang): string {
  const l = lang || getLang();
  return strings[key]?.[l] || strings[key]?.["zh"] || key;
}
