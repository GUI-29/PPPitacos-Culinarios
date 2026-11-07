import { Router } from "express";
import { listar, alterarPerfil } from "../controllers/userController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { autorizar } from "../middlewares/autorizar.js";

const router = Router();

// autenticar SEMPRE antes de autorizar
router.get("/", autenticar, autorizar("ADMIN"), listar);
router.patch("/:id/role", autenticar, autorizar("ADMIN"), alterarPerfil);

export default router;
