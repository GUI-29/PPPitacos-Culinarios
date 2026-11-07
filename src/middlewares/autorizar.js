// Responde à pergunta: "o que você PODE fazer?" -> falha = 403 Forbidden
// Deve vir DEPOIS do autenticar, pois depende de req.usuario.
// Uso: router.get("/users", autenticar, autorizar("ADMIN"), listar)
export function autorizar(...perfis) {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.role)) {
      return res
        .status(403)
        .json({ erro: "Acesso negado: você não tem permissão para esta ação." });
    }
    next();
  };
}
