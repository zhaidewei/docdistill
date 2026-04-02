import { useEffect, useRef, useState } from "preact/hooks";
import type { Graph, Card, GraphNode } from "../lib/types";

const RELATION_COLORS: Record<string, string> = {
  requires: "#f97316",
  extends: "#22c55e",
  related: "#4b5563",
  compares: "#eab308",
};

interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export default function KnowledgeGraph({ graph, cards }: { graph: Graph; cards: Card[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<SimNode | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    import("d3").then((d3) => {
      renderGraph(d3);
    });
  }, []);

  function renderGraph(d3: typeof import("d3")) {
    const svg = d3.select(svgRef.current!);
    const width = svgRef.current!.clientWidth;
    const height = svgRef.current!.clientHeight;

    svg.selectAll("*").remove();
    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
    const links = graph.edges.map((e) => ({
      source: e.from,
      target: e.to,
      relation: e.relation,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.selectAll("line").data(links).join("line")
      .attr("stroke", (d: any) => RELATION_COLORS[d.relation] || "#4b5563")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    const node = g.selectAll("g.node").data(nodes).join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node.append("circle")
      .attr("r", (d) => 16 + (d.cardCount || 1) * 4)
      .attr("fill", "rgba(249, 115, 22, 0.15)")
      .attr("stroke", "#f97316")
      .attr("stroke-width", 1.5);

    node.append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "11px");

    node.on("click", (event: any, d: SimNode) => {
      setSelected(d);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  const relatedEdges = selected
    ? graph.edges.filter((e) => e.from === selected.id || e.to === selected.id)
    : [];

  const requires = relatedEdges
    .filter((e) => e.to === selected?.id && e.relation === "requires")
    .map((e) => graph.nodes.find((n) => n.id === e.from)?.label)
    .filter(Boolean);

  const extends_ = relatedEdges
    .filter((e) => e.from === selected?.id && e.relation === "extends")
    .map((e) => graph.nodes.find((n) => n.id === e.to)?.label)
    .filter(Boolean);

  return (
    <div class="relative h-[calc(100vh-49px)]">
      <svg ref={svgRef} class="w-full h-full" />
      {selected && (
        <div class="absolute top-4 right-4 w-56 bg-black/80 border border-accent-orange/30 rounded-lg p-4 text-sm">
          <div class="text-[11px] text-accent-orange tracking-wider mb-1">SELECTED NODE</div>
          <div class="font-medium text-base mb-2">{selected.label}</div>
          <div class="text-gray-500 text-xs mb-3">{selected.cardCount} 张卡片 · {selected.group}</div>
          {requires.length > 0 && (
            <div class="text-gray-400 text-xs mb-1">
              <span class="text-accent-orange">←</span> 需要先了解: {requires.join(", ")}
            </div>
          )}
          {extends_.length > 0 && (
            <div class="text-gray-400 text-xs mb-3">
              <span class="text-accent-green">→</span> 延伸: {extends_.join(", ")}
            </div>
          )}
          <a href={`/?card=${selected.id}`} class="block text-center bg-surface-raised text-gray-200 px-3 py-1.5 rounded text-xs hover:bg-surface-raised/80">
            查看相关卡片 →
          </a>
        </div>
      )}
      <div class="absolute bottom-4 left-4 bg-black/60 rounded-lg p-3 text-xs space-y-1">
        {Object.entries(RELATION_COLORS).map(([rel, color]) => (
          <div key={rel} class="flex items-center gap-2">
            <div class="w-4 h-0.5" style={{ backgroundColor: color }} />
            <span class="text-gray-400">{rel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
