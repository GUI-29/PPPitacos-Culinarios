import { Router } from "express";
import { registrar, login, me, trocarSenha } from "../controllers/authController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { limitarLogin } from "../middlewares/limitarLogin.js";

const router = Router();

router.post("/register", registrar); // pública
router.post("/login", limitarLogin, login); // pública (com limite de tentativas)
router.get("/me", autenticar, me); // logado
router.patch("/senha", autenticar, trocarSenha); // logado (extra)

export default router;
