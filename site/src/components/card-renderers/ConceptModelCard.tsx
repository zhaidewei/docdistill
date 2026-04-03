import type { ConceptModelBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
export default function ConceptModelCard({ body, lang }: { body: ConceptModelBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-purple-600/5 border-l-3 border-purple-600 p-4 rounded-r">
        <div class="text-[11px] text-purple-600 tracking-wider mb-1">{t("label.concept", lang)}</div>
        <div class="text-charcoal">{body.concept}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.analogy", lang)}</div>
        <div class="text-charcoal-light">{body.analogy}</div>
      </div>
      {body.visual && (
        <div class="bg-surface-raised p-4 rounded border border-surface-border">
          <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.visual", lang)}</div>
          <div class="text-slate text-sm italic">{body.visual}</div>
        </div>
      )}
    </div>
  );
}
