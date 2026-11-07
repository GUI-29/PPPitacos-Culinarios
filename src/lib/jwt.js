import jwt from "jsonwebtoken";

function segredo() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET não definida no .env");
  return s;
}

// Payload mínimo: sub (id do usuário) e role (perfil).
// Nunca colocamos senha, hash nem dados sensíveis: o payload é apenas
// codificado em Base64URL, qualquer pessoa consegue ler.
export function gerarToken(usuario) {
  return jwt.sign({ role: usuario.role }, segredo(), {
    subject: String(usuario.id),
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    algorithm: "HS256",
  });
}

// jwt.verify confere assinatura E validade (exp). Lança erro se algo estiver errado.
export function verificarToken(token) {
  return jwt.verify(token, segredo(), { algorithms: ["HS256"] });
}
