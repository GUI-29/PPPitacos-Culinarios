import express from "express";
import authRoutes from "./routes/authRoutes.js";
import receitaRoutes from "./routes/receitaRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { naoEncontrada, tratarErros } from "./middlewares/erros.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ api: "PPPitacos Culinários", status: "no ar", documentacao: "veja o README.md" });
});

app.use("/auth", authRoutes);
app.use("/receitas", receitaRoutes);
app.use("/users", userRoutes);

app.use(naoEncontrada);
app.use(tratarErros);

export default app;
