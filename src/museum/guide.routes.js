import express from "express";
import {
  createEdge,
  createNode,
  getEdges,
  getNodes,
  guideQuery,
} from "./guide.controller.js";

const router = express.Router();

router.post("/query", guideQuery);
router.post("/nodes", createNode);
router.get("/nodes", getNodes);
router.post("/edges", createEdge);
router.get("/edges", getEdges);

export default router;