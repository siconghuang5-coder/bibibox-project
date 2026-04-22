const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.product.updateMany({
    where: { slug: 'bibi-smart-dome' },
    data: { coverUrl: '/static/bibi-smart-dome.png' }
  });
  await prisma.product.updateMany({
    where: { slug: 'avatar-smart-pendant' },
    data: { coverUrl: '/static/avatar-pendant.png' }
  });
  await prisma.product.updateMany({
    where: { slug: 'ai-companion-ring' },
    data: { coverUrl: '/static/ai-smart-ring.png' }
  });
  console.log('Fixed additional products in DB');
}
main().catch(console.error).finally(() => prisma.$disconnect());
