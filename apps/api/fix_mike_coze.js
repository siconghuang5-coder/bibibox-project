const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.digitalHuman.updateMany({
    where: { slug: 'mike' },
    data: { cozeBotId: '7631486690280587264' }
  });
  console.log('Fixed Mike Coze ID in DB');
}
main().catch(console.error).finally(() => prisma.$disconnect());
