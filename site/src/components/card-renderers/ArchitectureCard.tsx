import type { ArchitectureBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
import MdText from "../MdText";
export default function ArchitectureCard({ body, lang }: { body: ArchitectureBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-cyan-600/5 border-l-3 border-cyan-600 p-4 rounded-r">
        <div class="text-[11px] text-cyan-600 tracking-wider mb-1">{t("label.overview", lang)}</div>
        <MdText text={body.overview} class="text-charcoal" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        {body.components.map((comp, i) => (
          <div key={i} class="bg-surface-raised p-3 rounded border border-surface-border">
            <div class="text-sm font-medium text-charcoal">{comp.name}</div>
            <MdText text={comp.role} class="text-xs text-slate mt-1" />
          </div>
        ))}
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.flow", lang)}</div>
        <MdText text={body.flow} class="text-charcoal-light text-sm" />
      </div>
    </div>
  );
}
