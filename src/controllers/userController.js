import { prisma } from "../lib/prisma.js";

const PERFIS_VALIDOS = ["USER", "ADMIN"];

// GET /users  (somente ADMIN)
export async function listar(req, res) {
  const usuarios = await prisma.user.findMany({
    omit: { password: true },
    orderBy: { id: "asc" },
  });
  res.json(usuarios);
}

// PATCH /users/:id/role  (somente ADMIN)
export async function alterarPerfil(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID inválido." });
  }

  const { role } = req.body ?? {};
  if (!PERFIS_VALIDOS.includes(role)) {
    return res.status(400).json({ erro: `role deve ser um destes valores: ${PERFIS_VALIDOS.join(", ")}.` });
  }

  const existe = await prisma.user.findUnique({ where: { id } });
  if (!existe) return res.status(404).json({ erro: "Usuário não encontrado." });

  const usuario = await prisma.user.update({
    where: { id },
    data: { role },
    omit: { password: true },
  });
  // O token antigo do usuário continua com o perfil antigo até expirar:
  // ele precisa fazer login de novo para receber um token com o novo perfil.
  res.json({ ...usuario, aviso: "O usuário precisa fazer login novamente para receber o novo perfil no token." });
}
