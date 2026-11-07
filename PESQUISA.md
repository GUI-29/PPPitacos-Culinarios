# PESQUISA — Projeto API Segura (PPPitacos Culinários)

**Grupo:** Davi Alexandre, Guilherme Alves, Pedro H. Hahnl · 3º AI · ETECAMP
**Projeto:** API de receitas (tema 4). Recurso principal: `Receita`, que pertence a um usuário (o autor).

---

## A. Fundamentos

### 1. Autenticação × autorização

**Autenticação** é provar quem você é; **autorização** é decidir o que você pode fazer depois de identificado. No nosso projeto, autenticar é fazer `POST /auth/login` com e-mail e senha e receber um token. Autorizar é o sistema decidir, por exemplo, que só o autor (ou um ADMIN) pode editar uma receita.
Quando a autenticação falha (sem token, token inválido, senha errada) a API devolve **401 Unauthorized**, porque o sistema não sabe quem está pedindo. Quando a autorização falha (o Davi tenta editar a receita do Guilherme) devolve **403 Forbidden**, porque sabemos quem é, mas ele não tem permissão. Na prática: 401 = "não sei quem você é", 403 = "sei quem você é e a resposta é não".

### 2. Stateful × stateless

No login com **sessão no servidor** (como o `$_SESSION` do PHP) o servidor guarda os dados do usuário na memória ou em arquivo e entrega ao navegador só um ID de sessão num cookie. Vantagem: dá para encerrar a sessão na hora (logout de verdade). Desvantagem: o servidor precisa guardar estado, o que complica quando há vários servidores.
No login com **token (JWT)** o servidor não guarda nada: tudo que ele precisa está dentro do token assinado. Vantagem: escala fácil e a API não precisa consultar sessão a cada requisição. Desvantagem: não dá para "cancelar" um token já emitido antes de ele expirar (o logout não invalida o token). Na nossa API usamos token, por isso o `autenticar` só chama `jwt.verify` e não consulta o banco para saber se existe sessão.

### 3. Hash × criptografia × encoding

- **Encoding** (codificação) só muda a representação dos dados e qualquer um desfaz, sem chave. Exemplo: Base64URL.
- **Criptografia** embaralha os dados com uma chave e permite desfazer quem tem a chave (é de duas vias).
- **Hash** transforma o dado em uma "impressão digital" de tamanho fixo e é de uma via: não existe conta para voltar ao original.

Para **senhas** usamos hash (bcrypt), porque o sistema nunca precisa saber a senha, só conferir se ela bate. No **header e no payload do JWT** é usado encoding (Base64URL), por isso qualquer pessoa consegue ler o conteúdo do token (ele não é secreto). O que protege o token é a **assinatura** (HMAC-SHA256 com a nossa chave), que impede a alteração.

### 4. bcrypt e salt

MD5 e SHA-256 foram feitos para serem **rápidos**, e isso é ruim para senhas: um atacante com uma placa de vídeo testa bilhões de palpites por segundo. O bcrypt é propositalmente **lento** e ajustável, então cada tentativa de adivinhar custa caro.
O **custo** (no nosso código é 10, em `CUSTO_BCRYPT`) significa que o algoritmo repete o trabalho 2^10 = 1024 vezes; aumentando 1, o tempo dobra. O **salt** é um texto aleatório gerado a cada senha e misturado a ela antes do hash. Por causa dele, duas pessoas com a mesma senha têm hashes diferentes e tabelas prontas de hashes (rainbow tables) não funcionam. O bcrypt guarda o salt dentro do próprio hash (`$2b$10$...`), por isso não precisamos de uma coluna separada. No nosso projeto isso acontece em `bcrypt.hash(senha, CUSTO_BCRYPT)` no cadastro e `bcrypt.compare` no login.

---

## B. JWT

### 5. Estrutura

Um JWT tem três partes separadas por ponto: **header** (algoritmo e tipo, ex.: `HS256` e `JWT`), **payload** (as informações, chamadas de claims) e **signature** (assinatura calculada com header + payload + chave secreta).
Exemplo de token gerado no formato do nosso projeto (usando uma chave de demonstração, só para este exemplo):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiVVNFUiIsInN1YiI6IjIiLCJpYXQiOjE3NjIzODcyMDAsImV4cCI6MTc2MjM5MDgwMH0.6mCHMW9yeYKanLZhxyh2TCkuANsNuPqUDUy8oGf86d4
```

Decodificado no jwt.io:

```json
// HEADER
{ "alg": "HS256", "typ": "JWT" }
// PAYLOAD
{ "role": "USER", "sub": "2", "iat": 1762387200, "exp": 1762390800 }
```

> **Atenção (grupo):** para a entrega, façam login com o `davi@pppitacos.com` no projeto de vocês, colem o token real no jwt.io e **troquem o exemplo acima por um print/texto do token de vocês**.

### 6. Claims

`sub` (subject) identifica de quem é o token (guardamos o id do usuário); `iat` (issued at) é o momento em que o token foi criado; `exp` (expiration) é o momento em que ele deixa de valer. São claims registradas na RFC 7519.
No nosso token colocamos **`sub`** (para saber quem é), **`role`** (para o `autorizar` decidir sem consultar o banco), `iat` e `exp` (a biblioteca preenche a partir do `expiresIn`). Não colocamos mais nada de propósito: o payload só é codificado, então **não deve conter** senha, hash da senha, dados pessoais sensíveis ou qualquer segredo.

### 7. Assinatura

A assinatura é calculada com o header, o payload e a chave secreta (`JWT_SECRET`) que só o servidor conhece. Se alguém trocar `"role":"USER"` por `"ADMIN"` no payload, a assinatura antiga deixa de bater com o conteúdo novo, e o atacante não consegue gerar uma nova porque não tem a chave. O `jwt.verify` recalcula a assinatura e recusa o token.
A diferença: **`jwt.decode()`** só lê o conteúdo do token (Base64URL) e **não confere nada**, qualquer token falso passa. **`jwt.verify()`** confere a assinatura e a validade (`exp`) e lança erro se algo estiver errado. Por isso o nosso `autenticar` usa sempre `verify`, dentro de um `try/catch` para transformar o erro em resposta 401.

### 8. Validade e logout

Com JWT puro, o logout não invalida nada no servidor: o token continua válido até o `exp`; "sair" é só o cliente apagar o token. Se o perfil de um usuário mudar (USER → ADMIN pelo `PATCH /users/:id/role`), o token antigo continua com o `role` antigo até expirar, e o usuário precisa fazer login de novo para receber um token novo. Por isso escolhemos uma validade curta (1 hora, `JWT_EXPIRES_IN`).
**Refresh token** é um segundo token, de vida longa, guardado com mais cuidado, usado apenas para pedir um novo token de acesso quando o primeiro expira. Assim o token de acesso pode ser bem curto (minutos) sem obrigar o usuário a digitar a senha toda hora, e o servidor consegue revogar o refresh token. Não implementamos (é um extra do trabalho).

---

## C. Segurança na prática

### 9. Onde guardar o token

No **localStorage**, qualquer script JavaScript da página consegue ler o token; se o site tiver uma falha de XSS, o atacante rouba o token. No **cookie HttpOnly** o JavaScript não consegue ler o cookie (só o navegador o envia), o que protege contra roubo por XSS, mas cookies são enviados automaticamente e ficam expostos ao CSRF (mitigado com `SameSite` e tokens anti-CSRF).
**XSS** (Cross-Site Scripting) é quando um atacante consegue injetar e executar JavaScript dentro do nosso site (por exemplo, numa receita com `<script>` no texto que seja exibida sem tratamento). **CSRF** (Cross-Site Request Forgery) é quando outro site faz o navegador do usuário enviar uma requisição para o nosso site aproveitando o cookie que o navegador já tem. Nossa API recebe o token no header `Authorization: Bearer`, que o navegador não envia sozinho, então ela não sofre CSRF; a decisão de onde o front-end guarda o token ficaria para a parte do cliente.

### 10. Chave secreta

A `JWT_SECRET` fica no `.env` para que o segredo não esteja escrito no código (que vai para o GitHub) e possa mudar de um ambiente para outro sem alterar o programa. O `.env` está no `.gitignore` e só o `.env.example` (com valor fictício) vai para o repositório.
Se a chave vazasse no GitHub, qualquer pessoa poderia **assinar tokens válidos** com o `sub` e o `role` que quisesse, inclusive `"role":"ADMIN"`, e a API acreditaria neles. A correção seria trocar a chave imediatamente (o que invalida todos os tokens existentes) e remover o segredo do histórico do repositório.

### 11. RBAC e dono do recurso

**RBAC** (controle de acesso baseado em perfis/roles) decide pelo perfil do usuário: quem é ADMIN pode listar usuários e mudar perfis, quem é USER não. No nosso código aparece no middleware `autorizar('ADMIN')` (`src/middlewares/autorizar.js`), usado em `src/routes/userRoutes.js`.
O controle **por dono** decide pela relação entre o usuário e o recurso: só o autor da receita pode editá-la ou apagá-la (o ADMIN também pode, como moderador). Aparece na função `carregarComPermissao` em `src/controllers/receitaController.js`, que compara `receita.autorId` com `req.usuario.id`, e o id vem do **token**, nunca do body. Um não substitui o outro: o RBAC não sabe de quem é cada receita, e a regra do dono não sabe quem é ADMIN.

### 12. OWASP

1. **Guardar senhas com hash lento e salt** (Password Storage Cheat Sheet). A OWASP recomenda algoritmos próprios para senhas; o Argon2id é a primeira opção e o bcrypt é aceito com fator de custo mínimo 10. **Nosso projeto segue em parte:** usamos bcrypt com custo 10 (atende o mínimo do bcrypt), mas em produção avaliaríamos Argon2id.
2. **Mensagens de erro genéricas no login** (Authentication Cheat Sheet): não revelar se o erro foi no e-mail ou na senha. **Seguimos:** a API sempre responde "E-mail ou senha inválidos." e ainda compara com um hash falso quando o e-mail não existe, para o tempo de resposta não entregar a diferença.

Pontos em que **não** seguimos totalmente: a OWASP recomenda senhas mais longas do que 6 caracteres (exigimos 6 por causa do enunciado) e proteção contra tentativas em massa, que implementamos com `express-rate-limit` (10 falhas em 15 minutos), mas não temos autenticação em dois fatores.

---

## Referências

1. JONES, M.; BRADLEY, J.; SAKIMURA, N. RFC 7519 — JSON Web Token (JWT). IETF, 2015. Disponível em: <https://datatracker.ietf.org/doc/html/rfc7519>. 
2. JWT.IO. Introduction to JSON Web Tokens. Disponível em: <https://www.jwt.io/introduction>.
3. OWASP. Password Storage Cheat Sheet. Disponível em: <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>. 
4. OWASP. Authentication Cheat Sheet. Disponível em: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>. 
5. OWASP. Top 10:2021 — A01 Broken Access Control. Disponível em: <https://owasp.org/Top10/A01_2021-Broken_Access_Control/>. 
6. MDN Web Docs. 401 Unauthorized. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401>. 
7. MDN Web Docs. 403 Forbidden. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403>. 
8. EXPRESS. Error handling. Disponível em: <https://expressjs.com/en/guide/error-handling.html>. 
9. PRISMA. Excluding fields (omit). Disponível em: <https://www.prisma.io/docs/orm/prisma-client/queries/excluding-fields>. 
10. NPM. jsonwebtoken. Disponível em: <https://www.npmjs.com/package/jsonwebtoken>. 
11. NPM. bcryptjs. Disponível em: <https://www.npmjs.com/package/bcryptjs>. 

