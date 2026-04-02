import type { ComparisonBody } from "../../lib/types";
export default function ComparisonCard({ body }: { body: ComparisonBody }) {
  return (
    <div class="space-y-3">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-border">
              <th class="text-left p-2 text-gray-500 font-normal"></th>
              <th class="text-left p-2 text-accent-orange font-medium">{body.itemA}</th>
              <th class="text-left p-2 text-blue-400 font-medium">{body.itemB}</th>
            </tr>
          </thead>
          <tbody>
            {body.dimensions.map((dim, i) => (
              <tr key={i} class="border-b border-surface-border/50">
                <td class="p-2 text-gray-400 font-medium">{dim.name}</td>
                <td class="p-2 text-gray-300">{dim.a}</td>
                <td class="p-2 text-gray-300">{dim.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
