import MuseumEdge from "./museum-edge.model.js";
import MuseumNode from "./museum-node.model.js";
import Section from "./section.model.js";
import { computeRoute } from "./guide.service.js";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const findBestSectionByQuestion = (sections, questionRaw) => {
  const question = normalize(questionRaw);
  if (!question) {
    return null;
  }

  let best = null;
  for (const section of sections) {
    const candidates = [section.nombre, ...(section.aliases || [])]
      .filter(Boolean)
      .map((text) => normalize(text));

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      if (question.includes(candidate)) {
        if (!best || candidate.length > best.match.length) {
          best = { section, match: candidate };
        }
      }
    }
  }

  return best?.section || null;
};

export const createNode = async (req, res) => {
  try {
    const node = new MuseumNode(req.body);
    await node.save();
    res.status(201).json(node);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getNodes = async (_req, res) => {
  try {
    const nodes = await MuseumNode.find().sort({ key: 1 });
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createEdge = async (req, res) => {
  try {
    const edge = new MuseumEdge(req.body);
    await edge.save();
    res.status(201).json(edge);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getEdges = async (_req, res) => {
  try {
    const edges = await MuseumEdge.find().sort({ fromKey: 1, toKey: 1 });
    res.json(edges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const guideQuery = async (req, res) => {
  try {
    const { question, currentNodeKey, target } = req.body || {};

    if (!currentNodeKey) {
      return res.status(400).json({ error: "currentNodeKey es requerido" });
    }

    const sections = await Section.find().lean();
    if (!sections.length) {
      return res.status(404).json({ error: "No hay secciones configuradas" });
    }

    let targetSection = null;
    if (target) {
      const targetNormalized = normalize(target);
      targetSection =
        sections.find((item) => normalize(item.nombre) === targetNormalized) ||
        sections.find((item) => (item.aliases || []).map(normalize).includes(targetNormalized));
    } else {
      targetSection = findBestSectionByQuestion(sections, question);
    }

    if (!targetSection) {
      return res.status(404).json({
        error: "No pude identificar la sección solicitada",
        hint: "Incluye el nombre del área o registra aliases en la sección",
      });
    }

    const route = await computeRoute(currentNodeKey, targetSection.nodeKey);
    if (!route.found) {
      return res.status(404).json({
        error: "No existe ruta entre tu ubicación y la sección solicitada",
        detail: route.reason,
      });
    }

    const responseText =
      route.totalDistance === 0
        ? `Ya estás en ${targetSection.nombre}.`
        : `Para llegar a ${targetSection.nombre}, ${route.instructionText}`;

    return res.json({
      success: true,
      targetSection: {
        id: targetSection._id,
        nombre: targetSection.nombre,
        nodeKey: targetSection.nodeKey,
      },
      currentNodeKey: normalize(currentNodeKey),
      totalDistance: route.totalDistance,
      steps: route.path,
      responseText,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};