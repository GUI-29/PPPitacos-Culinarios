// Teste automático T1–T10 (e alguns extras). Precisa do servidor rodando
// (npm run dev) e do banco recém-populado (npx prisma migrate reset).
// Uso:  npm run testar            -> T1–T10
//       npm run testar -- --limite -> também testa o 429 (reinicie o servidor depois)
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function req(metodo, caminho, { token, body, headers } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    /* 204 sem corpo */
  }
  return { status: r.status, json };
}

const resultados = [];
function checar(id, descricao, obtido, esperado, extra = true) {
  const ok = obtido === esperado && extra;
  resultados.push({ id, descricao, esperado, obtido, ok });
}

async function logar(email) {
  const r = await req("POST", "/auth/login", { body: { email, senha: "Senha123" } });
  if (r.status !== 200) throw new Error(`Login de ${email} falhou (${r.status}). Rodou o seed?`);
  return r.json.token;
}

async function main() {
  const tokenAdmin = await logar("admin@pppitacos.com");
  const tokenDavi = await logar("davi@pppitacos.com");

  let r = await req("POST", "/auth/register", {
    body: { nome: "Teste Auto", email: `auto${Date.now()}@pppitacos.com`, senha: "segredo123" },
  });
  checar("T1", "Cadastro válido (resposta sem senha)", r.status, 201, r.json && !("password" in r.json));

  r = await req("POST", "/auth/register", {
    body: { nome: "Repetido", email: "davi@pppitacos.com", senha: "segredo123" },
  });
  checar("T2", "Cadastro com e-mail repetido", r.status, 409);

  r = await req("POST", "/auth/login", { body: { email: "davi@pppitacos.com", senha: "errada" } });
  checar("T3", "Login com senha errada", r.status, 401);

  r = await req("GET", "/auth/me");
  checar("T4", "Rota protegida sem token", r.status, 401);

  r = await req("GET", "/auth/me", { token: tokenDavi });
  checar("T5", "Rota protegida com token válido", r.status, 200);

  r = await req("POST", "/receitas", {
    token: tokenDavi,
    body: { titulo: "Teste auto", ingredientes: "x", modoPreparo: "y", autorId: 1 },
  });
  checar("T6", "Criar receita mandando o dono no body (ignorado)", r.status, 201, r.json?.autorId === 2);

  r = await req("PUT", "/receitas/3", { token: tokenDavi, body: { titulo: "invasor" } });
  checar("T7", "USER alterando receita de outro USER", r.status, 403);

  r = await req("GET", "/users", { token: tokenDavi });
  checar("T8", "USER em rota de ADMIN", r.status, 403);

  r = await req("GET", "/users", { token: tokenAdmin });
  checar("T9", "ADMIN em rota de ADMIN", r.status, 200);

  r = await req("PUT", "/receitas/9999", { token: tokenDavi, body: { titulo: "x" } });
  checar("T10", "Recurso inexistente", r.status, 404);

  // extras de autenticação (os 3 tipos de 401)
  r = await req("GET", "/auth/me", { headers: { Authorization: tokenDavi } });
  checar("E1", "Header sem 'Bearer' (formato errado)", r.status, 401);
  r = await req("GET", "/auth/me", { token: tokenDavi.slice(0, -2) + "xx" });
  checar("E2", "Token com assinatura adulterada", r.status, 401);

  if (process.argv.includes("--limite")) {
    let ultimo = 0;
    for (let i = 0; i < 11; i++) {
      ultimo = (await req("POST", "/auth/login", { body: { email: "davi@pppitacos.com", senha: "x" } })).status;
    }
    checar("E3", "Limite de tentativas de login (11ª falha)", ultimo, 429);
  }

  console.table(
    resultados.map((x) => ({
      Teste: x.id,
      Cenário: x.descricao,
      Esperado: x.esperado,
      Obtido: x.obtido,
      Resultado: x.ok ? "OK" : "FALHOU",
    }))
  );
  const falhas = resultados.filter((x) => !x.ok).length;
  console.log(falhas === 0 ? "Todos os testes passaram." : `${falhas} teste(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro ao rodar os testes:", e.message);
  process.exit(1);
});
