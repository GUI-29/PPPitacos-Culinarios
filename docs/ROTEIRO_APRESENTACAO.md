# Roteiro da apresentação (8 a 10 minutos) — PPPitacos Culinários

Todos falam. Sugestão de divisão (troquem à vontade, mas todos precisam saber tudo):

| Tempo | Quem | O que dizer |
|---|---|---|
| 1 min | Davi | Tema (receitas), recurso principal (`Receita`), perfis: visitante, USER, ADMIN. |
| 2 min | Guilherme | Diagrama do README: cadastro (hash) → login (token) → requisição protegida (`autenticar`). |
| 4 min | Pedro (demo) + todos comentando | Veja a demonstração abaixo. |
| 1–3 min | Sorteado pelo professor | Explicar o trecho de código escolhido. |

## Antes de entrar na sala

1. `npx prisma migrate reset` (recria o banco com o seed) e `npx prisma generate`.
2. `npm run dev` rodando; `requests.http` aberto; logins já enviados (admin, davi, guilherme).
3. jwt.io aberto em outra aba.
4. **Plano B:** vídeo curto gravando a demonstração.

## Demonstração ao vivo (ordem)

1. **Login** do Davi → copiar o token → colar no **jwt.io** e mostrar header/payload (`sub`, `role`, `iat`, `exp`). Dizer: "qualquer um lê, mas ninguém altera sem a chave".
2. `GET /auth/me` **sem token** → **401**.
3. `GET /auth/me` **com token** → **200**.
4. Davi tenta `PUT /receitas/3` (receita do Guilherme) → **403** (dono).
5. `GET /users` com token do Davi → **403** (perfil) e com token do Admin → **200**.
6. (Se sobrar tempo) apagar uma letra da assinatura do token → **401**.

## Respostas prontas para a arguição (decorem a ideia, não o texto)

1. **Onde a senha vira hash? Por que hashes diferentes para a mesma senha?** Em `authController.registrar`, `bcrypt.hash(senha, 10)`. O bcrypt gera um **salt** aleatório a cada hash e o embute no resultado.
2. **E se eu apagar uma letra da assinatura?** O `jwt.verify` recalcula a assinatura, não bate, lança erro e o `autenticar` responde 401 "Token inválido".
3. **Por que `jwt.verify` está dentro de `try/catch`?** Porque o `verify` **lança exceção** quando o token é inválido ou expirado; o `catch` transforma isso em resposta 401 em vez de derrubar a requisição com erro 500.
4. **Por que `autorizar` vem depois de `autenticar`?** O `autorizar` lê `req.usuario.role`, que é preenchido pelo `autenticar`. Sem saber quem é, não dá para saber o que pode.
5. **De onde vem o id do dono na criação? Por que não do corpo?** Do token (`req.usuario.id`). O corpo é controlado pelo cliente: se aceitássemos, qualquer um criaria receita em nome de outro.
6. **Se eu promover um USER a ADMIN, o token dele muda?** Não. O token é imutável e continua com o `role` antigo até expirar (1 h). O usuário precisa **fazer login de novo**.
7. **Onde está a chave secreta? E se for para o GitHub?** No `.env` (`JWT_SECRET`), que está no `.gitignore`. Se vazar, qualquer um assina tokens com `role: ADMIN`; é preciso trocar a chave na hora.
8. **Diferença entre 401 e 403?** 401: não sei quem você é (sem token, token ruim, login errado). 403: sei quem é, mas não tem permissão (perfil ou dono).

## Perguntas extras que podem cair

- **Por que mensagem de erro genérica no login?** Para não revelar se o e-mail existe.
- **Por que 404 antes de 403?** Primeiro verificamos se a receita existe; só então conferimos se o usuário pode mexer nela.
- **O que é `omit: { password: true }`?** Recurso do Prisma para nunca devolver a coluna `password` nas respostas.
- **Por que o payload só tem `sub` e `role`?** Payload é legível por todos; guardamos o mínimo necessário.
