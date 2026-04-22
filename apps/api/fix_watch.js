const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.product.updateMany({
    where: { slug: 'aura-watch-s2' },
    data: { coverUrl: '/static/aura-watch.png' }
  });
  console.log('Fixed Aura Watch cover image in DB');
}
main().catch(console.error).finally(() => prisma.$disconnect());
