const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.digitalHuman.updateMany({
    where: { slug: 'mobai' },
    data: { cozeBotId: '7631491880735735842' }
  });
  console.log('Fixed Mobo Coze ID in DB:', result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
