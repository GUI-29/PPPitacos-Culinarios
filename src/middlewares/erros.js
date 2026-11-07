export function naoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não existe.` });
}

// Tratador de erros do Express (4 parâmetros). No Express 5, erros de
// funções async chegam aqui automaticamente.
export function tratarErros(erro, req, res, next) {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição." });
  }
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
}
