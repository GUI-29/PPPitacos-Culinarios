import { verificarToken } from "../lib/jwt.js";

// Responde à pergunta: "QUEM é você?"  -> falha = 401 Unauthorized
// Os 3 tipos de 401: sem token, formato errado, token inválido/expirado.
export function autenticar(req, res, next) {
  const header = req.headers.authorization;

  // 1) sem token
  if (!header) {
    return res.status(401).json({ erro: "Token não informado." });
  }

  // 2) formato errado (esperado: "Bearer <token>")
  const partes = header.split(" ");
  if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
    return res
      .status(401)
      .json({ erro: "Formato inválido. Use: Authorization: Bearer <token>" });
  }

  // 3) token inválido (assinatura errada, adulterado) ou expirado
  try {
    const payload = verificarToken(partes[1]);
    // o id e o perfil vêm do TOKEN assinado, nunca do body da requisição
    req.usuario = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch (erro) {
    if (erro.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado. Faça login novamente." });
    }
    return res.status(401).json({ erro: "Token inválido." });
  }
}
