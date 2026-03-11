import Section from "./section.model.js";

export const createSection = async (req, res) => {
  try {
    const section = new Section(req.body);
    await section.save();
    res.status(201).json(section);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getSections = async (_req, res) => {
  try {
    const sections = await Section.find();
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ error: "Sección no encontrada" });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!section) return res.status(404).json({ error: "Sección no encontrada" });
    res.json(section);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ error: "Sección no encontrada" });
    res.json({ message: "Sección eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
