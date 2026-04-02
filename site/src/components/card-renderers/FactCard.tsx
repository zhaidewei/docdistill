import type { FactBody } from "../../lib/types";
export default function FactCard({ body }: { body: FactBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-blue-500/10 border-l-3 border-blue-400 p-4 rounded-r">
        <div class="text-[11px] text-blue-400 tracking-wider mb-1">FACT</div>
        <div class="text-gray-200">{body.fact}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">CONTEXT</div>
        <div class="text-gray-400 text-sm">{body.context}</div>
      </div>
    </div>
  );
}
