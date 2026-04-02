import type { HowToBody } from "../../lib/types";
export default function HowToCard({ body }: { body: HowToBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-green-500/10 border-l-3 border-accent-green p-4 rounded-r">
        <div class="text-[11px] text-accent-green tracking-wider mb-1">GOAL</div>
        <div class="text-gray-200">{body.goal}</div>
      </div>
      <ol class="space-y-2 pl-0">
        {body.steps.map((step, i) => (
          <li key={i} class="flex gap-3 bg-surface-raised p-3 rounded">
            <span class="text-accent-green font-mono text-sm shrink-0">{i + 1}.</span>
            <span class="text-gray-300 text-sm">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
