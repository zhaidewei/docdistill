import { useState, useEffect } from "preact/hooks";
import { getSwipeStats } from "../lib/swipe";
import { useLang, t } from "../lib/i18n";
import type { Card } from "../lib/types";

export default function ProgressBar({ cards }: { cards: Card[] }) {
  const [lang] = useLang();
  const [stats, setStats] = useState({ unseen: 0, review: 0, mastered: 0 });

  useEffect(() => {
    setStats(getSwipeStats(cards));
  }, []);

  const total = cards.length;
  const pct = total === 0 ? 0 : Math.round((stats.mastered / total) * 100);
  if (total === 0) return null;

  return (
    <div
      class="w-full h-0.5 bg-surface-muted relative"
      title={`${stats.mastered}/${total} ${t("progress.mastered", lang)}`}
    >
      <div
        class="absolute left-0 top-0 h-full bg-accent-green transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
