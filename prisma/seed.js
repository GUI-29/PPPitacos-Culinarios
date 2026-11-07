import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const SENHA = "Senha123";

async function main() {
  // limpa e zera os contadores para os IDs ficarem sempre iguais (1, 2, 3...)
  await prisma.receita.deleteMany();
  await prisma.user.deleteMany();
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name IN ('User','Receita')`);
  } catch {
    /* sem problema: só significa que não havia contadores */
  }

  const password = await bcrypt.hash(SENHA, 10);

  // id 1 = ADMIN, id 2 = Davi (USER), id 3 = Guilherme (USER)
  const admin = await prisma.user.create({
    data: { nome: "Administrador", email: "admin@pppitacos.com", password, role: "ADMIN" },
  });
  const davi = await prisma.user.create({
    data: { nome: "Davi Alexandre", email: "davi@pppitacos.com", password, role: "USER" },
  });
  const guilherme = await prisma.user.create({
    data: { nome: "Guilherme Alves", email: "guilherme@pppitacos.com", password, role: "USER" },
  });

  await prisma.receita.createMany({
    data: [
      // receitas 1 e 2 -> Davi
      {
        titulo: "Brigadeiro de panela",
        ingredientes: "1 lata de leite condensado, 1 colher (sopa) de manteiga, 4 colheres (sopa) de chocolate em pó, granulado",
        modoPreparo: "Misture tudo na panela em fogo baixo, mexendo até desgrudar do fundo. Esfrie, enrole e passe no granulado.",
        autorId: davi.id,
      },
      {
        titulo: "Pão de queijo mineiro",
        ingredientes: "500 g de polvilho azedo, 1 xícara de leite, 1/2 xícara de óleo, 2 ovos, 200 g de queijo meia cura ralado, sal",
        modoPreparo: "Escalde o polvilho com leite e óleo quentes, junte ovos e queijo, modele bolinhas e asse a 200 °C por 25 minutos.",
        autorId: davi.id,
      },
      // receitas 3 e 4 -> Guilherme
      {
        titulo: "Strogonoff de frango",
        ingredientes: "500 g de peito de frango, 1 cebola, 2 colheres (sopa) de ketchup, 1 colher (sopa) de mostarda, 1 caixa de creme de leite, sal",
        modoPreparo: "Refogue a cebola, doure o frango em cubos, junte ketchup e mostarda e, por último, o creme de leite.",
        autorId: guilherme.id,
      },
      {
        titulo: "Panqueca de carne moída",
        ingredientes: "2 ovos, 1 xícara de leite, 1 xícara de farinha de trigo, sal, 300 g de carne moída, molho de tomate, queijo",
        modoPreparo: "Bata a massa e frite os discos. Recheie com a carne refogada, enrole, cubra com molho e queijo e gratine.",
        autorId: guilherme.id,
      },
      // receita 5 -> Admin
      {
        titulo: "Bolo de cenoura com cobertura",
        ingredientes: "3 cenouras, 4 ovos, 1 xícara de óleo, 2 xícaras de açúcar, 2 xícaras de farinha, 1 colher (sopa) de fermento",
        modoPreparo: "Bata cenoura, ovos, óleo e açúcar no liquidificador, misture a farinha e o fermento e asse a 180 °C por 40 minutos.",
        autorId: admin.id,
      },
    ],
  });

  console.log("Seed concluído: 1 ADMIN, 2 USERs e 5 receitas.");
  console.log(`Senha de todos os usuários de teste: ${SENHA}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
