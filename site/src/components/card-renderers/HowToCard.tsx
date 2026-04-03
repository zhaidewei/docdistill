import type { HowToBody } from "../../lib/types";
import { t, type Lang } from "../../lib/i18n";
export default function HowToCard({ body, lang }: { body: HowToBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="bg-accent-green/5 border-l-3 border-accent-green p-4 rounded-r">
        <div class="text-[11px] text-accent-green tracking-wider mb-1">{t("label.goal", lang)}</div>
        <div class="text-charcoal">{body.goal}</div>
      </div>
      <ol class="space-y-2 pl-0">
        {body.steps.map((step, i) => (
          <li key={i} class="flex gap-3 bg-surface-raised p-3 rounded">
            <span class="text-accent-green font-mono text-sm shrink-0">{i + 1}.</span>
            <span class="text-charcoal-light text-sm">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
