import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const CARDS_DIR = join(ROOT, "content", "cards");
const GRAPH_PATH = join(ROOT, "content", "graph.json");

function main() {
  const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith(".json"));
  const nodes = [];
  const edges = [];
  const tagGroups = {};

  for (const file of files) {
    const card = JSON.parse(readFileSync(join(CARDS_DIR, file), "utf-8"));

    const group = card.tags?.[0] || "general";
    if (!tagGroups[group]) tagGroups[group] = [];
    tagGroups[group].push(card.id);

    nodes.push({
      id: card.id,
      label: card.title,
      group,
      type: card.type,
    });

    if (card.relatedIds) {
      for (const relId of card.relatedIds) {
        edges.push({
          from: card.id,
          to: relId,
          relation: card.relationType || "related",
        });
      }
    }
  }

  const edgeSet = new Set();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.from}-${e.to}-${e.relation}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  for (const node of nodes) {
    node.cardCount = tagGroups[node.group]?.length || 1;
  }

  const graph = { nodes, edges: uniqueEdges };
  writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
  console.log(`Graph: ${nodes.length} nodes, ${uniqueEdges.length} edges`);
}

main();
