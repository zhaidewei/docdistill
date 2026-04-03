import type { FactBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
export default function FactCard({ body, lang }: { body: FactBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-blue-500/10 border-l-3 border-blue-400 p-4 rounded-r">
        <div class="text-[11px] text-blue-400 tracking-wider mb-1">{t("label.fact", lang)}</div>
        <div class="text-gray-200">{body.fact}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">{t("label.context", lang)}</div>
        <div class="text-gray-400 text-sm">{body.context}</div>
      </div>
    </div>
  );
}
