const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const item = await prisma.digitalHuman.findFirst({ where: { slug: 'liu-ruyan' } });
  if (item) {
    await prisma.digitalHuman.update({
      where: { id: item.id },
      data: { cozeBotId: '7631511579925905448' }
    });
    console.log('Updated DB: liu-ruyan bound to 7631511579925905448');
  } else {
    console.log('Error: liu-ruyan not found in database');
  }
}
run();
