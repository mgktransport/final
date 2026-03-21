// Create user accounts for existing chauffeurs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔗 Creating user accounts for existing chauffeurs...\n');

  const chauffeurs = await prisma.chauffeur.findMany({
    where: { actif: true },
  });

  for (const chauffeur of chauffeurs) {
    // Create email based on chauffeur name
    const email = `${chauffeur.nom.toLowerCase()}.${chauffeur.prenom.toLowerCase()}@chauffeur.mgktransport.ma`;
    const defaultPassword = chauffeur.cin; // Use CIN as default password

    // Check if user already exists for this chauffeur
    const existingUser = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { email },
          { chauffeurId: chauffeur.id }
        ]
      }
    });

    if (!existingUser) {
      await prisma.utilisateur.create({
        data: {
          email,
          motDePasse: defaultPassword,
          nom: chauffeur.nom,
          prenom: chauffeur.prenom,
          role: 'CHAUFFEUR',
          actif: chauffeur.actif,
          chauffeurId: chauffeur.id,
        },
      });
      console.log(`✅ Created account for ${chauffeur.nom} ${chauffeur.prenom}:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${defaultPassword}\n`);
    } else {
      console.log(`ℹ️  Account already exists for ${chauffeur.nom} ${chauffeur.prenom}`);
    }
  }

  console.log('\n🎉 Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
