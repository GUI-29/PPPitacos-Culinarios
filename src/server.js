import "dotenv/config";
import app from "./app.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET não definida. Copie .env.example para .env e preencha.");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PPPitacos Culinários rodando em http://localhost:${PORT}`);
});
