import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse } from '@/types';

interface ResetResult {
  table: string;
  deleted: number;
}

// POST /api/reinitialiser - Reset all application data
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ results: ResetResult[] }>>> {
  try {
    // Get confirmation from request body
    const body = await request.json();
    const { confirmation } = body;

    // Require specific confirmation string
    if (confirmation !== 'REINITIALISER_TOUTES_DONNEES') {
      return NextResponse.json(
        { success: false, error: 'Confirmation invalide' },
        { status: 400 }
      );
    }

    console.log('[REINITIALISER] Starting full data reset...');

    const results: ResetResult[] = [];

    // Helper function to safely delete from a table
    const safeDelete = async (tableName: string, deleteFn: () => Promise<{ count: number }>) => {
      try {
        const result = await deleteFn();
        results.push({ table: tableName, deleted: result.count });
        console.log(`[REINITIALISER] Deleted ${result.count} ${tableName}`);
      } catch (error) {
        console.log(`[REINITIALISER] Table ${tableName} not found or error:`, error);
        results.push({ table: tableName, deleted: 0 });
      }
    };

    // Delete in order of dependencies (children first, then parents)

    // 1. Delete alertes
    await safeDelete('Alertes', () => db.alerte.deleteMany({}));

    // 2. Delete paiements
    await safeDelete('Paiements', () => db.paiement.deleteMany({}));

    // 3. Delete factures
    await safeDelete('Factures', () => db.facture.deleteMany({}));

    // 4. Delete tournées
    await safeDelete('Tournées', () => db.tournee.deleteMany({}));

    // 5. Delete exploitation services
    await safeDelete('Exploitations', () => db.exploitationService.deleteMany({}));

    // 6. Delete service-vehicule relations
    await safeDelete('ServiceVehicules', () => db.serviceVehicule.deleteMany({}));

    // 7. Delete services
    await safeDelete('Services', () => db.service.deleteMany({}));

    // 8. Delete clients
    await safeDelete('Clients', () => db.client.deleteMany({}));

    // 9. Delete pleins de carburant
    await safeDelete('PleinsCarburant', () => db.pleinCarburant.deleteMany({}));

    // 10. Delete entretiens
    await safeDelete('Entretiens', () => db.entretien.deleteMany({}));

    // 11. Delete vehicule documents
    await safeDelete('DocumentsVehicule', () => db.documentVehicule.deleteMany({}));

    // 12. Delete charges
    await safeDelete('Charges', () => db.charge.deleteMany({}));

    // 13. Delete paiement achat (using Prisma ORM)
    await safeDelete('PaiementAchat', () => db.paiementAchat.deleteMany({}));

    // 14. Delete echeances credit (using Prisma ORM)
    await safeDelete('EcheanceCredit', () => db.echeanceCredit.deleteMany({}));

    // 15. Delete achat vehicule (using Prisma ORM)
    await safeDelete('AchatVehicule', () => db.achatVehicule.deleteMany({}));

    // 16. Delete vehicules
    await safeDelete('Véhicules', () => db.vehicule.deleteMany({}));

    // 17. Delete salaires
    await safeDelete('Salaires', () => db.salaire.deleteMany({}));

    // 18. Delete bulletins de paie
    await safeDelete('BulletinsPaie', () => db.bulletinPaie.deleteMany({}));

    // 19. Delete primes
    await safeDelete('Primes', () => db.prime.deleteMany({}));

    // 20. Delete avances
    await safeDelete('Avances', () => db.avance.deleteMany({}));

    // 21. Delete chauffeur documents
    await safeDelete('DocumentsChauffeur', () => db.documentChauffeur.deleteMany({}));

    // 22. Delete chauffeurs
    await safeDelete('Chauffeurs', () => db.chauffeur.deleteMany({}));

    // 23. Delete logs
    await safeDelete('Logs', () => db.log.deleteMany({}));

    // 24. Delete utilisateurs (except keep sessions)
    await safeDelete('Utilisateurs', () => db.utilisateur.deleteMany({}));

    // 25. Delete types documents personnalisés
    await safeDelete('TypesDocuments', () => db.typeDocumentPersonnalise.deleteMany({}));

    // 26. Delete types entretien personnalisés
    await safeDelete('TypesEntretien', () => db.typeEntretienPersonnalise.deleteMany({}));

    // 27. Delete categories charges personnalisées
    await safeDelete('CategoriesCharges', () => db.categorieChargePersonnalise.deleteMany({}));

    // 28. Keep parametres (company info, notification settings)
    // Don't delete parametres - user might want to keep company info

    // 29. Add mustChangePassword column if it doesn't exist
    console.log('[REINITIALISER] Ensuring mustChangePassword column exists...');
    try {
      await db.$executeRaw`ALTER TABLE "Utilisateur" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      // Ignore if column already exists or can't be added
    }

    // 30. Create default admin user after reset
    console.log('[REINITIALISER] Creating default admin user...');
    try {
      const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Use raw SQL to create admin user
      await db.$executeRaw`
        INSERT INTO "Utilisateur" (id, email, "motDePasse", nom, prenom, role, actif, "createdAt", "updatedAt", "mustChangePassword")
        VALUES (${adminId}, 'admin@mgktransport.ma', 'admin123', 'Administrateur', 'MGK', 'ADMIN', true, NOW(), NOW(), false)
      `;
      
      console.log('[REINITIALISER] Default admin user created: admin@mgktransport.ma');
      results.push({ table: 'AdminUserCreated', deleted: 1 });
    } catch (adminError) {
      console.error('[REINITIALISER] Error creating admin user:', adminError);
      // Try without mustChangePassword column
      try {
        const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await db.$executeRaw`
          INSERT INTO "Utilisateur" (id, email, "motDePasse", nom, prenom, role, actif, "createdAt", "updatedAt")
          VALUES (${adminId}, 'admin@mgktransport.ma', 'admin123', 'Administrateur', 'MGK', 'ADMIN', true, NOW(), NOW())
        `;
        console.log('[REINITIALISER] Default admin user created (fallback): admin@mgktransport.ma');
        results.push({ table: 'AdminUserCreated', deleted: 1 });
      } catch (fallbackError) {
        console.error('[REINITIALISER] Fallback error creating admin user:', fallbackError);
        results.push({ table: 'AdminUserCreated', deleted: 0 });
      }
    }

    console.log('[REINITIALISER] Reset complete!');

    return NextResponse.json({
      success: true,
      data: { results },
      message: 'Application réinitialisée avec succès',
    });
  } catch (error) {
    console.error('[REINITIALISER] Error during reset:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la réinitialisation: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}
