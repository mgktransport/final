// API pour exporter toutes les données de l'application
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/backup/export - Export all database data
export async function GET(request: NextRequest) {
  try {
    // Fetch all data from all tables
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        utilisateurs: await db.utilisateur.findMany({
          select: {
            id: true,
            email: true,
            motDePasse: true,
            nom: true,
            prenom: true,
            role: true,
            actif: true,
            chauffeurId: true,
            createdAt: true,
            updatedAt: true,
          }
        }),
        
        chauffeurs: await db.chauffeur.findMany(),
        salaires: await db.salaire.findMany(),
        primes: await db.prime.findMany(),
        avances: await db.avance.findMany(),
        documentsChauffeur: await db.documentChauffeur.findMany(),
        typesDocumentPersonnalise: await db.typeDocumentPersonnalise.findMany(),
        
        vehicules: await db.vehicule.findMany(),
        entretiens: await db.entretien.findMany(),
        typesEntretienPersonnalise: await db.typeEntretienPersonnalise.findMany(),
        pleinsCarburant: await db.pleinCarburant.findMany(),
        documentsVehicule: await db.documentVehicule.findMany(),
        achatsVehicule: await db.achatVehicule.findMany(),
        echeancesCredit: await db.echeanceCredit.findMany(),
        paiementsAchat: await db.paiementAchat.findMany(),
        
        clients: await db.client.findMany(),
        services: await db.service.findMany(),
        servicesVehicule: await db.serviceVehicule.findMany(),
        tournees: await db.tournee.findMany(),
        exploitations: await db.exploitationService.findMany(),
        
        factures: await db.facture.findMany(),
        paiements: await db.paiement.findMany(),
        
        alertes: await db.alerte.findMany(),
        charges: await db.charge.findMany(),
        categoriesChargePersonnalise: await db.categorieChargePersonnalise.findMany(),
        
        parametres: await db.parametre.findMany(),
        entreprise: await db.entreprise.findMany(),
        bulletinsPaie: await db.bulletinPaie.findMany(),
        logs: await db.log.findMany(),
      }
    };

    // Return as JSON file download
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mgk_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'export des données' },
      { status: 500 }
    );
  }
}
