import type { ProblemSolutionBody } from "../../lib/types";
export default function ProblemSolutionCard({ body }: { body: ProblemSolutionBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-red-500/10 border-l-3 border-accent-red p-4 rounded-r">
        <div class="text-[11px] text-accent-red tracking-wider mb-1">PROBLEM</div>
        <div class="text-gray-200">{body.problem}</div>
      </div>
      <div class="bg-green-500/10 border-l-3 border-accent-green p-4 rounded-r">
        <div class="text-[11px] text-accent-green tracking-wider mb-1">SOLUTION</div>
        <div class="text-gray-200">{body.solution}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">💡 KEY TAKEAWAY</div>
        <div class="text-gray-300">{body.keyTakeaway}</div>
      </div>
    </div>
  );
}
