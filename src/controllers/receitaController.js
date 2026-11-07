import { prisma } from "../lib/prisma.js";

// inclui o nome do autor, mas nunca a senha dele
const incluirAutor = { autor: { select: { id: true, nome: true } } };

function lerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validarCorpo(body, parcial = false) {
  const { titulo, ingredientes, modoPreparo } = body ?? {};
  const campos = { titulo, ingredientes, modoPreparo };
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor === undefined && parcial) continue;
    if (typeof valor !== "string" || valor.trim() === "") {
      return { erro: `O campo "${nome}" é obrigatório e deve ser texto.` };
    }
  }
  const dados = {};
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor !== undefined) dados[nome] = valor.trim();
  }
  return { dados };
}

// GET /receitas  (pública: receitas são públicas para ler)
export async function listar(req, res) {
  const receitas = await prisma.receita.findMany({
    include: incluirAutor,
    orderBy: { id: "asc" },
  });
  res.json(receitas);
}

// GET /receitas/minhas  (logado)
export async function listarMinhas(req, res) {
  const receitas = await prisma.receita.findMany({
    where: { autorId: req.usuario.id },
    include: incluirAutor,
    orderBy: { id: "asc" },
  });
  res.json(receitas);
}

// GET /receitas/:id  (pública)
export async function buscar(req, res) {
  const id = lerId(req);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const receita = await prisma.receita.findUnique({ where: { id }, include: incluirAutor });
  if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });
  res.json(receita);
}

// POST /receitas  (logado)  -> 201 | 400
export async function criar(req, res) {
  const { dados, erro } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  const receita = await prisma.receita.create({
    // REGRA DO DONO: o autor vem do TOKEN (req.usuario.id).
    // Se o cliente mandar "autorId" no body, é ignorado.
    data: { ...dados, autorId: req.usuario.id },
    include: incluirAutor,
  });
  res.status(201).json(receita);
}

// Busca a receita e confere a regra do dono.
// Ordem importante: 404 (não existe) ANTES de 403 (existe, mas não é sua).
async function carregarComPermissao(req, res) {
  const id = lerId(req);
  if (!id) {
    res.status(400).json({ erro: "ID inválido." });
    return null;
  }

  const receita = await prisma.receita.findUnique({ where: { id } });
  if (!receita) {
    res.status(404).json({ erro: "Receita não encontrada." });
    return null;
  }

  const ehDono = receita.autorId === req.usuario.id;
  const ehAdmin = req.usuario.role === "ADMIN";
  if (!ehDono && !ehAdmin) {
    res.status(403).json({ erro: "Você só pode alterar ou remover as suas próprias receitas." });
    return null;
  }
  return receita;
}

// PUT /receitas/:id  (dono ou ADMIN)
export async function atualizar(req, res) {
  const receita = await carregarComPermissao(req, res);
  if (!receita) return;

  const { dados, erro } = validarCorpo(req.body, true);
  if (erro) return res.status(400).json({ erro });
  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  // autorId nunca é aceito do body: o dono da receita não muda.
  const atualizada = await prisma.receita.update({
    where: { id: receita.id },
    data: dados,
    include: incluirAutor,
  });
  res.json(atualizada);
}

// DELETE /receitas/:id  (dono ou ADMIN)
export async function remover(req, res) {
  const receita = await carregarComPermissao(req, res);
  if (!receita) return;

  await prisma.receita.delete({ where: { id: receita.id } });
  res.status(204).send();
}
