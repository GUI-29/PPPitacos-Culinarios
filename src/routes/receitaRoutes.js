import { Router } from "express";
import { listar, listarMinhas, buscar, criar, atualizar, remover } from "../controllers/receitaController.js";
import { autenticar } from "../middlewares/autenticar.js";

const router = Router();

router.get("/", listar); // pública
router.get("/minhas", autenticar, listarMinhas); // logado (antes de "/:id"!)
router.get("/:id", buscar); // pública
router.post("/", autenticar, criar); // logado
router.put("/:id", autenticar, atualizar); // dono ou ADMIN (regra no controller)
router.delete("/:id", autenticar, remover); // dono ou ADMIN (regra no controller)

export default router;
