import type { FactBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
import MdText from "../MdText";
export default function FactCard({ body, lang }: { body: FactBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-accent-blue/5 border-l-3 border-accent-blue p-4 rounded-r">
        <div class="text-[11px] text-accent-blue tracking-wider mb-1">{t("label.fact", lang)}</div>
        <MdText text={body.fact} class="text-charcoal" />
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.context", lang)}</div>
        <MdText text={body.context} class="text-slate text-sm" />
      </div>
    </div>
  );
}
