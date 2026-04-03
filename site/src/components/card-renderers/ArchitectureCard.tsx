import type { ArchitectureBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
export default function ArchitectureCard({ body, lang }: { body: ArchitectureBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-cyan-600/5 border-l-3 border-cyan-600 p-4 rounded-r">
        <div class="text-[11px] text-cyan-600 tracking-wider mb-1">{t("label.overview", lang)}</div>
        <div class="text-charcoal">{body.overview}</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        {body.components.map((comp, i) => (
          <div key={i} class="bg-surface-raised p-3 rounded border border-surface-border">
            <div class="text-sm font-medium text-charcoal">{comp.name}</div>
            <div class="text-xs text-slate mt-1">{comp.role}</div>
          </div>
        ))}
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-slate-light tracking-wider mb-1">{t("label.flow", lang)}</div>
        <div class="text-charcoal-light text-sm">{body.flow}</div>
      </div>
    </div>
  );
}
