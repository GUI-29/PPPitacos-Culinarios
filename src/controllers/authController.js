import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { gerarToken } from "../lib/jwt.js";

const CUSTO_BCRYPT = 10; // "custo" = 2^10 rodadas; o salt é gerado e embutido no hash
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash falso, usado para gastar o mesmo tempo quando o e-mail não existe
// (evita descobrir quais e-mails estão cadastrados medindo o tempo da resposta).
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-tempo", CUSTO_BCRYPT);

// POST /auth/register  (pública)  -> 201 | 400 | 409
export async function registrar(req, res) {
  const { nome, email, senha } = req.body ?? {};
  // Obs.: "role" enviado no body é IGNORADO de propósito. Todo cadastro nasce USER.

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "nome, email e senha são obrigatórios." });
  }
  if (typeof nome !== "string" || typeof email !== "string" || typeof senha !== "string") {
    return res.status(400).json({ erro: "nome, email e senha devem ser texto." });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ erro: "E-mail em formato inválido." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });
  }

  const emailLimpo = email.trim().toLowerCase();
  const existente = await prisma.user.findUnique({ where: { email: emailLimpo } });
  if (existente) {
    return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
  }

  const hash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  const usuario = await prisma.user.create({
    data: { nome: nome.trim(), email: emailLimpo, password: hash },
    omit: { password: true }, // a senha nunca volta na resposta
  });

  return res.status(201).json(usuario);
}

// POST /auth/login  (pública)  -> 200 | 400 | 401
export async function login(req, res) {
  const { email, senha } = req.body ?? {};

  if (typeof email !== "string" || typeof senha !== "string" || !email || !senha) {
    return res.status(400).json({ erro: "email e senha são obrigatórios." });
  }

  const usuario = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // compara sempre (com hash falso se o usuário não existe) e responde com
  // mensagem GENÉRICA: não revela se o erro foi no e-mail ou na senha.
  const senhaCorreta = await bcrypt.compare(senha, usuario ? usuario.password : HASH_FALSO);
  if (!usuario || !senhaCorreta) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  const token = gerarToken(usuario);
  return res.status(200).json({
    token,
    tipo: "Bearer",
    expiraEm: process.env.JWT_EXPIRES_IN || "1h",
  });
}

// GET /auth/me  (logado)  -> dados do dono do token
export async function me(req, res) {
  const usuario = await prisma.user.findUnique({
    where: { id: req.usuario.id },
    omit: { password: true },
  });
  if (!usuario) {
    return res.status(401).json({ erro: "Usuário do token não existe mais." });
  }
  return res.json(usuario);
}

// EXTRA: PATCH /auth/senha  (logado) -> confere a senha atual antes de trocar
export async function trocarSenha(req, res) {
  const { senhaAtual, novaSenha } = req.body ?? {};

  if (typeof senhaAtual !== "string" || typeof novaSenha !== "string" || !senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: "senhaAtual e novaSenha são obrigatórias." });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ erro: "A nova senha deve ter pelo menos 6 caracteres." });
  }

  const usuario = await prisma.user.findUnique({ where: { id: req.usuario.id } });
  if (!usuario) {
    return res.status(401).json({ erro: "Usuário do token não existe mais." });
  }

  const confere = await bcrypt.compare(senhaAtual, usuario.password);
  if (!confere) {
    return res.status(401).json({ erro: "Senha atual incorreta." });
  }

  const hash = await bcrypt.hash(novaSenha, CUSTO_BCRYPT);
  await prisma.user.update({ where: { id: usuario.id }, data: { password: hash } });
  return res.json({ mensagem: "Senha alterada com sucesso." });
}
