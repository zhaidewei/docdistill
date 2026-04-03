import type { ProblemSolutionBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
export default function ProblemSolutionCard({ body, lang }: { body: ProblemSolutionBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-accent-red/5 border-l-3 border-accent-red p-4 rounded-r">
        <div class="text-[11px] text-accent-red tracking-wider mb-1">{t("label.problem", lang)}</div>
        <div class="text-charcoal">{body.problem}</div>
      </div>
      <div class="bg-accent-green/5 border-l-3 border-accent-green p-4 rounded-r">
        <div class="text-[11px] text-accent-green tracking-wider mb-1">{t("label.solution", lang)}</div>
        <div class="text-charcoal">{body.solution}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.takeaway", lang)}</div>
        <div class="text-charcoal-light">{body.keyTakeaway}</div>
      </div>
    </div>
  );
}
