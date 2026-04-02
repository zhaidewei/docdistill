import type { ConceptModelBody } from "../../lib/types";
export default function ConceptModelCard({ body }: { body: ConceptModelBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-purple-500/10 border-l-3 border-purple-400 p-4 rounded-r">
        <div class="text-[11px] text-purple-400 tracking-wider mb-1">CONCEPT</div>
        <div class="text-gray-200">{body.concept}</div>
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">🧠 ANALOGY</div>
        <div class="text-gray-300">{body.analogy}</div>
      </div>
      {body.visual && (
        <div class="bg-surface-raised p-4 rounded border border-surface-border">
          <div class="text-[11px] text-gray-500 tracking-wider mb-1">📐 VISUAL</div>
          <div class="text-gray-400 text-sm italic">{body.visual}</div>
        </div>
      )}
    </div>
  );
}
