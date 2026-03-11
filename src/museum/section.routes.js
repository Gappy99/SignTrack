import express from "express";
import {
  createSection,
  deleteSection,
  getSectionById,
  getSections,
  updateSection,
} from "./section.controller.js";

const router = express.Router();

// Crear una nueva sección
router.post("/", createSection);

// Obtener todas las secciones
router.get("/", getSections);

// Obtener una sección por ID
router.get("/:id", getSectionById);

// Actualizar una sección
router.put("/:id", updateSection);

// Eliminar una sección
router.delete("/:id", deleteSection);

export default router;
