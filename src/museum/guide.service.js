import MuseumEdge from "./museum-edge.model.js";

const OPPOSITE_DIRECTION = {
  derecha: "izquierda",
  izquierda: "derecha",
  frente: "atras",
  atras: "frente",
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const toInstructions = (path) => {
  if (!path || path.length === 0) {
    return "Ya te encuentras en esa sección.";
  }

  const grouped = [];
  for (const step of path) {
    const prev = grouped[grouped.length - 1];
    if (prev && prev.direction === step.direction) {
      prev.distance += step.distance;
    } else {
      grouped.push({ direction: step.direction, distance: step.distance });
    }
  }

  const parts = grouped.map((step) => {
    const tramo = step.distance === 1 ? "salon" : "salones";
    return `camina ${step.distance} ${tramo} hacia la ${step.direction}`;
  });

  return `${parts.join(", luego ")}.`;
};

export const computeRoute = async (startKeyRaw, targetKeyRaw) => {
  const startKey = normalize(startKeyRaw);
  const targetKey = normalize(targetKeyRaw);

  if (!startKey || !targetKey) {
    return { found: false, reason: "invalid_keys" };
  }

  if (startKey === targetKey) {
    return {
      found: true,
      path: [],
      totalDistance: 0,
      instructionText: "Ya te encuentras en esa sección.",
    };
  }

  const edges = await MuseumEdge.find().lean();
  if (!edges.length) {
    return { found: false, reason: "no_edges" };
  }

  const adjacency = new Map();
  const pushEdge = (from, to, direction, distance) => {
    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from).push({ to, direction, distance });
  };

  for (const edge of edges) {
    const from = normalize(edge.fromKey);
    const to = normalize(edge.toKey);
    const direction = normalize(edge.direction);
    const distance = Number(edge.distance) || 1;

    pushEdge(from, to, direction, distance);
    if (edge.bidirectional) {
      pushEdge(to, from, OPPOSITE_DIRECTION[direction] || direction, distance);
    }
  }

  const queue = [startKey];
  const visited = new Set([startKey]);
  const parent = new Map();

  while (queue.length) {
    const node = queue.shift();
    if (node === targetKey) {
      break;
    }

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) {
        continue;
      }
      visited.add(neighbor.to);
      parent.set(neighbor.to, {
        prev: node,
        direction: neighbor.direction,
        distance: neighbor.distance,
      });
      queue.push(neighbor.to);
    }
  }

  if (!visited.has(targetKey)) {
    return { found: false, reason: "path_not_found" };
  }

  const path = [];
  let cursor = targetKey;
  while (cursor !== startKey) {
    const data = parent.get(cursor);
    if (!data) {
      return { found: false, reason: "path_rebuild_failed" };
    }
    path.push({
      from: data.prev,
      to: cursor,
      direction: data.direction,
      distance: data.distance,
    });
    cursor = data.prev;
  }
  path.reverse();

  const totalDistance = path.reduce((sum, step) => sum + step.distance, 0);
  return {
    found: true,
    path,
    totalDistance,
    instructionText: toInstructions(path),
  };
};