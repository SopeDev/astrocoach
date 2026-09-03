import interpretations from "../../astrological-interpretations.en.json";

type FamiliarPattern = {
  summary: string;
  possible_expressions: string[];
};

type SignAxisInterpretation = {
  north_node: string;
  south_node: string;
  familiar_pattern: FamiliarPattern;
  developmental_direction: {
    summary: string;
    growth_possibilities: string[];
  };
};

type HouseAxisInterpretation = {
  north_node_house: number;
  south_node_house: number;
  familiar_pattern: FamiliarPattern;
  developmental_direction: string;
};

type ChartNode = {
  name?: unknown;
  sign?: unknown;
  house?: unknown;
};

const signAxes = Object.values(interpretations.lunar_nodes) as SignAxisInterpretation[];
const houseAxes = Object.values(interpretations.lunar_nodes_houses) as HouseAxisInterpretation[];

function chartNodes(value: unknown): ChartNode[] {
  if (!value || typeof value !== "object" || !("nodes" in value) || !Array.isArray(value.nodes)) return [];
  return value.nodes;
}

function namedNode(nodes: ChartNode[], direction: "north" | "south") {
  return nodes.find((node) => typeof node.name === "string" && node.name.toLowerCase().includes(direction));
}

export function lunarNodeInterpretationContext(chart: unknown) {
  const nodes = chartNodes(chart);
  const northNode = namedNode(nodes, "north");
  const southNode = namedNode(nodes, "south");
  if (!northNode || !southNode || typeof northNode.sign !== "string" || typeof southNode.sign !== "string") return null;

  const signAxis = signAxes.find((axis) => axis.north_node === northNode.sign && axis.south_node === southNode.sign);
  const houseAxis = typeof northNode.house === "number" && typeof southNode.house === "number"
    ? houseAxes.find((axis) => axis.north_node_house === northNode.house && axis.south_node_house === southNode.house)
    : undefined;

  if (!signAxis && !houseAxis) return null;

  return {
    source: {
      id: "lunar-node-interpretations",
      version: interpretations.version,
      language: interpretations.language,
    },
    signAxis: signAxis ? {
      northNode: signAxis.north_node,
      southNode: signAxis.south_node,
      familiarPattern: signAxis.familiar_pattern,
      developmentalDirection: signAxis.developmental_direction,
    } : null,
    houseAxis: houseAxis ? {
      northNodeHouse: houseAxis.north_node_house,
      southNodeHouse: houseAxis.south_node_house,
      familiarPattern: houseAxis.familiar_pattern,
      developmentalDirection: houseAxis.developmental_direction,
    } : null,
  };
}
