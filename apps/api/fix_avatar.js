const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.account.updateMany({
    where: { username: 'mobai' },
    data: { avatarUrl: '/static/mobo.png' }
  });
  await prisma.digitalHuman.updateMany({
    where: { slug: 'mobai' },
    data: { avatarUrl: '/static/mobo.png' }
  });
  console.log('Fixed Mobo avatar in DB');
}
main().catch(console.error).finally(() => prisma.$disconnect());
