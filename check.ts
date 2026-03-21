import { db } from './src/lib/db';

async function check() {
  const all = await db.chauffeur.findMany({
    select: { id: true, nom: true, numeroCNSS: true }
  });
  console.log('Tous les chauffeurs:');
  all.forEach(c => console.log(`  ${c.nom}: CNSS="${c.numeroCNSS}"`));
  await db.$disconnect();
}

check();
