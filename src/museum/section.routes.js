import express from "express";
import Section from "./section.model.js";

const router = express.Router();

// Crear una nueva sección
router.post("/", async (req, res) => {
  try {
    const section = new Section(req.body);
    await section.save();
    res.status(201).json(section);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener todas las secciones
router.get("/", async (_req, res) => {
  try {
    const sections = await Section.find();
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener una sección por ID
router.get("/:id", async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ error: "Sección no encontrada" });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar una sección
router.put("/:id", async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!section) return res.status(404).json({ error: "Sección no encontrada" });
    res.json(section);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar una sección
router.delete("/:id", async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ error: "Sección no encontrada" });
    res.json({ message: "Sección eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
