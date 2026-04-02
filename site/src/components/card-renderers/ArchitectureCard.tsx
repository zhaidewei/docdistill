import type { ArchitectureBody } from "../../lib/types";
export default function ArchitectureCard({ body }: { body: ArchitectureBody }) {
  return (
    <div class="space-y-3">
      <div class="bg-cyan-500/10 border-l-3 border-cyan-400 p-4 rounded-r">
        <div class="text-[11px] text-cyan-400 tracking-wider mb-1">OVERVIEW</div>
        <div class="text-gray-200">{body.overview}</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        {body.components.map((comp, i) => (
          <div key={i} class="bg-surface-raised p-3 rounded border border-surface-border">
            <div class="text-sm font-medium text-gray-200">{comp.name}</div>
            <div class="text-xs text-gray-400 mt-1">{comp.role}</div>
          </div>
        ))}
      </div>
      <div class="bg-surface-raised p-4 rounded">
        <div class="text-[11px] text-gray-500 tracking-wider mb-1">🔄 FLOW</div>
        <div class="text-gray-300 text-sm">{body.flow}</div>
      </div>
    </div>
  );
}
