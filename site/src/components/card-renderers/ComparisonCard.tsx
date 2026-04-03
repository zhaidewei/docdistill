import type { ComparisonBody } from "../../lib/types";
import type { Lang } from "../../lib/i18n";
export default function ComparisonCard({ body, lang }: { body: ComparisonBody; lang: Lang }) {
  return (
    <div class="space-y-3">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-border">
              <th class="text-left p-2 text-slate-light font-normal"></th>
              <th class="text-left p-2 text-accent-orange font-medium">{body.itemA}</th>
              <th class="text-left p-2 text-accent-blue font-medium">{body.itemB}</th>
            </tr>
          </thead>
          <tbody>
            {body.dimensions.map((dim, i) => (
              <tr key={i} class="border-b border-surface-border/50">
                <td class="p-2 text-slate font-medium">{dim.name}</td>
                <td class="p-2 text-charcoal-light">{dim.a}</td>
                <td class="p-2 text-charcoal-light">{dim.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
