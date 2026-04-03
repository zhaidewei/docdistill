export type CardType =
  | "fact"
  | "problem-solution"
  | "concept-model"
  | "how-to"
  | "comparison"
  | "architecture";

export interface FactBody {
  fact: string;
  context: string;
}

export interface ProblemSolutionBody {
  problem: string;
  solution: string;
  keyTakeaway: string;
}

export interface ConceptModelBody {
  concept: string;
  analogy: string;
  visual?: string;
}

export interface HowToBody {
  goal: string;
  steps: string[];
}

export interface ComparisonDimension {
  name: string;
  a: string;
  b: string;
}

export interface ComparisonBody {
  itemA: string;
  itemB: string;
  dimensions: ComparisonDimension[];
}

export interface ArchitectureComponent {
  name: string;
  role: string;
}

export interface ArchitectureBody {
  overview: string;
  components: ArchitectureComponent[];
  flow: string;
}

export type CardBody =
  | FactBody
  | ProblemSolutionBody
  | ConceptModelBody
  | HowToBody
  | ComparisonBody
  | ArchitectureBody;

export interface Card {
  id: string;
  type: CardType;
  title: string;
  title_en?: string;
  source: string;
  tags: string[];
  readingMinutes: number;
  body: CardBody;
  body_en?: CardBody;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  type: CardType;
  cardCount: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: "requires" | "extends" | "related" | "compares";
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Annotation {
  starred: boolean;
  comments: string[];
  questions: string[];
}
