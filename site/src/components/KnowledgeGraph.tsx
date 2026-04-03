import { useEffect, useRef, useState } from "preact/hooks";
import type { Graph, Card, GraphNode } from "../lib/types";
import { useLang, t, cardTitle } from "../lib/i18n";

const GROUP_COLORS: string[] = [
  "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308",
  "#06b6d4", "#ec4899", "#84cc16", "#f43f5e", "#8b5cf6",
  "#14b8a6", "#f59e0b", "#6366f1", "#10b981", "#ef4444",
];

const RELATION_COLORS: Record<string, string> = {
  requires: "#f97316",
  extends: "#22c55e",
  related: "#4b5563",
  compares: "#eab308",
};

interface ClusterNode {
  id: string;
  label: string;
  cardCount: number;
  cardIds: string[];
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface ClusterEdge {
  source: string;
  target: string;
  weight: number;
}

export default function KnowledgeGraph({ graph, cards }: { graph: Graph; cards: Card[] }) {
  const [lang] = useLang();
  const svgRef = useRef<SVGSVGElement>(null);
  const textSelRef = useRef<any>(null);
  const [selected, setSelected] = useState<ClusterNode | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const cardMap = new Map(cards.map((c) => [c.id, c]));

  function getNodeLabel(nodeId: string): string {
    const card = cardMap.get(nodeId);
    if (card) return cardTitle(card, lang);
    const node = graph.nodes.find((n) => n.id === nodeId);
    return node?.label || nodeId;
  }

  // Build cluster data: group cards by their group field
  function buildClusters() {
    const groups = new Map<string, string[]>();
    for (const node of graph.nodes) {
      const g = node.group || "other";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(node.id);
    }

    const colorMap = new Map<string, string>();
    let ci = 0;
    const clusterNodes: ClusterNode[] = [];
    for (const [group, ids] of groups) {
      const color = GROUP_COLORS[ci % GROUP_COLORS.length];
      colorMap.set(group, color);
      ci++;
      clusterNodes.push({
        id: `cluster:${group}`,
        label: group,
        cardCount: ids.length,
        cardIds: ids,
        color,
      });
    }

    // Aggregate edges between clusters
    const edgeMap = new Map<string, number>();
    for (const edge of graph.edges) {
      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;
      const fromCluster = `cluster:${fromNode.group || "other"}`;
      const toCluster = `cluster:${toNode.group || "other"}`;
      if (fromCluster === toCluster) continue;
      const key = [fromCluster, toCluster].sort().join("|");
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }

    const clusterEdges: ClusterEdge[] = [];
    for (const [key, weight] of edgeMap) {
      const [source, target] = key.split("|");
      clusterEdges.push({ source, target, weight });
    }

    return { clusterNodes, clusterEdges, colorMap };
  }

  // Build expanded view for a single group
  function buildExpanded(groupName: string, colorMap: Map<string, string>) {
    const groupIds = new Set(
      graph.nodes.filter((n) => (n.group || "other") === groupName).map((n) => n.id)
    );

    const nodes = graph.nodes
      .filter((n) => groupIds.has(n.id))
      .map((n) => ({
        ...n,
        color: colorMap.get(n.group || "other") || "#f97316",
      }));

    const edges = graph.edges.filter(
      (e) => groupIds.has(e.from) && groupIds.has(e.to)
    );

    return { nodes, edges };
  }

  useEffect(() => {
    if (!svgRef.current) return;
    import("d3").then((d3) => {
      if (expandedGroup) {
        const { colorMap } = buildClusters();
        const { nodes, edges } = buildExpanded(expandedGroup, colorMap);
        renderDetailGraph(d3, nodes, edges);
      } else {
        const { clusterNodes, clusterEdges } = buildClusters();
        renderClusterGraph(d3, clusterNodes, clusterEdges);
      }
    });
  }, [expandedGroup]);

  // Update text when lang changes
  useEffect(() => {
    if (textSelRef.current && expandedGroup) {
      textSelRef.current.text((d: any) => getNodeLabel(d.id));
    }
  }, [lang]);

  function renderClusterGraph(d3: typeof import("d3"), nodes: ClusterNode[], edges: ClusterEdge[]) {
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

    const simNodes = nodes.map((n) => ({ ...n }));
    const simEdges = edges.map((e) => ({ ...e }));

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force("link", d3.forceLink(simEdges as any).id((d: any) => d.id).distance(180))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => 20 + d.cardCount * 5));

    const link = g.selectAll("line").data(simEdges).join("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", (d: any) => Math.min(d.weight * 0.8, 4))
      .attr("stroke-opacity", 0.4);

    const node = g.selectAll("g.node").data(simNodes).join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    node.append("circle")
      .attr("r", (d: any) => 16 + d.cardCount * 4)
      .attr("fill", (d: any) => d.color + "25")
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", 2);

    node.append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "600");

    node.append("text")
      .text((d: any) => `${d.cardCount} cards`)
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("fill", "rgba(255,255,255,0.5)")
      .attr("font-size", "10px");

    node.on("click", (event: any, d: any) => {
      setExpandedGroup(d.label);
      setSelected(null);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    textSelRef.current = null;
  }

  function renderDetailGraph(d3: typeof import("d3"), nodes: (GraphNode & { color: string })[], edges: typeof graph.edges) {
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

    const simNodes = nodes.map((n) => ({ ...n })) as any[];
    const simEdges = edges.map((e) => ({ source: e.from, target: e.to, relation: e.relation }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force("link", d3.forceLink(simEdges as any).id((d: any) => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    const link = g.selectAll("line").data(simEdges).join("line")
      .attr("stroke", (d: any) => RELATION_COLORS[d.relation] || "#4b5563")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    const node = g.selectAll("g.node").data(simNodes).join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    node.append("circle")
      .attr("r", 24)
      .attr("fill", (d: any) => d.color + "20")
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", 1.5);

    const texts = node.append("text")
      .text((d: any) => {
        const label = getNodeLabel(d.id);
        return label.length > 20 ? label.slice(0, 18) + "…" : label;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "10px");
    textSelRef.current = texts;

    node.on("click", (event: any, d: any) => {
      setSelected(d);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  // Info for selected card node (only in detail view)
  const relatedEdges = selected
    ? graph.edges.filter((e) => e.from === selected.id || e.to === selected.id)
    : [];
  const requires = relatedEdges
    .filter((e) => e.to === selected?.id && e.relation === "requires")
    .map((e) => getNodeLabel(e.from)).filter(Boolean);
  const extends_ = relatedEdges
    .filter((e) => e.from === selected?.id && e.relation === "extends")
    .map((e) => getNodeLabel(e.to)).filter(Boolean);

  return (
    <div class="relative h-[calc(100vh-49px)]">
      <svg ref={svgRef} class="w-full h-full" />

      {/* Back button when expanded */}
      {expandedGroup && (
        <button
          onClick={() => { setExpandedGroup(null); setSelected(null); }}
          class="absolute top-4 left-4 px-3 py-1.5 bg-surface-raised border border-surface-border rounded text-sm text-gray-300 hover:text-white transition-colors"
        >
          ← {lang === "zh" ? "返回总览" : "Back to overview"}
        </button>
      )}

      {/* Group title when expanded */}
      {expandedGroup && (
        <div class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface-raised border border-surface-border rounded text-sm text-gray-200">
          {expandedGroup}
        </div>
      )}

      {/* Hint when in overview */}
      {!expandedGroup && !selected && (
        <div class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface-raised/80 border border-surface-border rounded text-xs text-gray-400">
          {lang === "zh" ? "点击主题圆圈展开查看具体卡片" : "Click a topic circle to expand"}
        </div>
      )}

      {/* Selected card info panel (detail view only) */}
      {selected && expandedGroup && (
        <div class="absolute top-4 right-4 w-60 bg-black/80 border border-accent-orange/30 rounded-lg p-4 text-sm">
          <div class="text-[11px] text-accent-orange tracking-wider mb-1">{t("graph.selectedNode", lang)}</div>
          <div class="font-medium text-base mb-2">{getNodeLabel(selected.id)}</div>
          <div class="text-gray-500 text-xs mb-3">{selected.group}</div>
          {requires.length > 0 && (
            <div class="text-gray-400 text-xs mb-1">
              <span class="text-accent-orange">←</span> {t("graph.requires", lang)}: {requires.join(", ")}
            </div>
          )}
          {extends_.length > 0 && (
            <div class="text-gray-400 text-xs mb-3">
              <span class="text-accent-green">→</span> {t("graph.extends", lang)}: {extends_.join(", ")}
            </div>
          )}
          <a href={`/?card=${selected.id}`} class="block text-center bg-surface-raised text-gray-200 px-3 py-1.5 rounded text-xs hover:bg-surface-raised/80">
            {t("graph.viewCards", lang)}
          </a>
        </div>
      )}

      {/* Legend */}
      <div class="absolute bottom-4 left-4 bg-black/60 rounded-lg p-3 text-xs space-y-1">
        {expandedGroup ? (
          Object.entries(RELATION_COLORS).map(([rel, color]) => (
            <div key={rel} class="flex items-center gap-2">
              <div class="w-4 h-0.5" style={{ backgroundColor: color }} />
              <span class="text-gray-400">{rel}</span>
            </div>
          ))
        ) : (
          <div class="text-gray-400">
            {lang === "zh" ? "线条粗细 = 关联强度" : "Line thickness = connection strength"}
          </div>
        )}
      </div>
    </div>
  );
}
