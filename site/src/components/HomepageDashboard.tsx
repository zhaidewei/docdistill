import { useState, useEffect } from "preact/hooks";
import { getSwipeStats } from "../lib/swipe";
import { useLang, t } from "../lib/i18n";
import type { Card } from "../lib/types";

export default function HomepageDashboard({ cards }: { cards: Card[] }) {
  const [lang] = useLang();
  const [stats, setStats] = useState({ unseen: 0, review: 0, mastered: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStats(getSwipeStats(cards));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const total = cards.length;
  const pct = total === 0 ? 0 : Math.round((stats.mastered / total) * 100);
  const hasStarted = stats.mastered > 0 || stats.review > 0;
  const allDone = stats.unseen === 0 && stats.review === 0 && stats.mastered > 0;

  return (
    <div style="max-width:560px;margin:0 auto 2.5rem;padding:1.5rem;background:#fff;border-radius:12px;border:1px solid #e8e6dc;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <span style="font-size:0.875rem;font-weight:500;color:#6b6b68;">{t("home.progress.title", lang)}</span>
        <span style="font-size:0.875rem;color:#6b6b68;">{stats.mastered}/{total}</span>
      </div>
      <div style="height:6px;background:#eae8e0;border-radius:999px;margin-bottom:0.75rem;overflow:hidden;">
        <div style={`height:100%;width:${pct}%;background:#2d8659;border-radius:999px;transition:width 0.5s;`} />
      </div>
      <div style="display:flex;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap;">
        <span style="font-size:0.8125rem;color:#2d8659;">✓ {stats.mastered} {t("home.progress.mastered", lang)}</span>
        {stats.review > 0 && (
          <span style="font-size:0.8125rem;color:#d97757;">↻ {stats.review} {t("home.progress.review", lang)}</span>
        )}
        {stats.unseen > 0 && (
          <span style="font-size:0.8125rem;color:#6b6b68;">◌ {stats.unseen} {t("home.progress.unseen", lang)}</span>
        )}
      </div>
      {allDone && (
        <p style="font-size:0.875rem;color:#6b6b68;margin-bottom:1rem;">{t("home.progress.allDone", lang)}</p>
      )}
      <a
        href="/cards"
        style="display:inline-block;padding:0.6rem 1.5rem;background:#1a1a18;color:#f5f4ed;border-radius:999px;font-size:0.875rem;font-weight:500;text-decoration:none;"
      >
        {hasStarted ? t("home.progress.continue", lang) : t("home.progress.start", lang)} →
      </a>
    </div>
  );
}
