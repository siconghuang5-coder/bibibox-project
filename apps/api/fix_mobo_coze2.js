const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.digitalHuman.findMany({ include: { account: true } });
  for (const u of users) {
    if (u.account.displayName === 'Ä«°×') {
      const result = await prisma.digitalHuman.update({
        where: { id: u.id },
        data: { cozeBotId: '7631491880735735842' }
      });
      console.log('Fixed Mobo! Slug was:', result.slug);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
