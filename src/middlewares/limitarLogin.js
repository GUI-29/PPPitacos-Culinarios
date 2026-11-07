import rateLimit from "express-rate-limit";

// EXTRA: limite de tentativas de login.
// Só conta tentativas que FALHAM (skipSuccessfulRequests). Após 10 erros
// em 15 minutos, o mesmo IP recebe 429 Too Many Requests.
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
});
