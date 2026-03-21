// API pour importer les données de l'application
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role, TypeContrat, TypeSalaire, TypeCarburant, TypeAchat, FrequencePaiement, StatutAchat, StatutEcheance, ModePaiementAchat, TypeContratClient, TypeService, StatutService, EtatPaiement, StatutFacture, ModePaiement, TypeAlerte, PrioriteAlerte, TypeCharge, SourceCharge } from '@prisma/client';

import bcrypt from 'bcryptjs';

// POST /api/backup/import - Import database data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }
    
    const text = await file.text();
    const backup = JSON.parse(text);
    
    // Validate backup structure
    if (!backup.version || !backup.data) {
      return NextResponse.json(
        { success: false, error: 'Format de fichier inval' },
        { status: 400 }
      );
    }
    
    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      const stats = {
        utilisateurs: 0,
        chauffeurs: 0,
        salaires: 0,
        primes: 0,
        avances: 0,
        documentsChauffeur: 0,
        typesDocumentPersonnalise: 0,
        vehicules: 0,
        entretiens: 0,
        typesEntretienPersonnalise: 0,
        pleinsCarburant: 0,
        documentsVehicule: 0,
        achatsVehicule: 0,
        echeancesCredit: 0,
        paiementsAchat: 0,
        clients: 0,
        services: 0,
        servicesVehicule: 0,
        tournees: 0,
        exploitations: 0,
        factures: 0,
        paiements: 0,
        alertes: 0,
        charges: 0,
        categoriesChargePersonnalise: 0,
        parametres: 0,
        entreprise: 0,
        bulletinsPaie: 0,
        logs: 0,
      };
      
      // Clear existing data (order matters due to foreign keys)
      // We'll delete in reverse dependency order
      await tx.log.deleteMany();
      await tx.bulletinPaie.deleteMany();
      await tx.paiement.deleteMany();
      await tx.facture.deleteMany();
      await tx.exploitationService.deleteMany();
      await tx.tournee.deleteMany();
      await tx.serviceVehicule.deleteMany();
      await tx.service.deleteMany();
      await tx.client.deleteMany();
      await tx.paiementAchat.deleteMany();
      await tx.echeanceCredit.deleteMany();
      await tx.achatVehicule.deleteMany();
      await tx.documentVehicule.deleteMany();
      await tx.pleinCarburant.deleteMany();
      await tx.entretien.deleteMany();
      await tx.vehicule.deleteMany();
      await tx.typeDocumentPersonnalise.deleteMany();
      await tx.documentChauffeur.deleteMany();
      await tx.avance.deleteMany();
      await tx.prime.deleteMany();
      await tx.salaire.deleteMany();
      await tx.chauffeur.deleteMany();
      await tx.charge.deleteMany();
      await tx.categorieChargePersonnalise.deleteMany();
      await tx.alerte.deleteMany();
      await tx.typeEntretienPersonnalise.deleteMany();
      await tx.entreprise.deleteMany();
      await tx.parametre.deleteMany();
      await tx.utilisateur.deleteMany();
      
      // === IMPORT DATA IN CORRECT ORDER ===
      // Order is critical due to foreign key constraints
      
      // 1. Independent entities first
      if (backup.data.parametres) {
        for (const item of backup.data.parametres) {
          await tx.parametre.create({ data: item });
          stats.parametres++;
        }
      }
      
      if (backup.data.entreprise) {
        for (const item of backup.data.entreprise) {
          await tx.entreprise.create({ data: item });
          stats.entreprise++;
        }
      }
      
      if (backup.data.typesEntretienPersonnalise) {
        for (const item of backup.data.typesEntretienPersonnalise) {
          await tx.typeEntretienPersonnalise.create({ data: item });
          stats.typesEntretienPersonnalise++;
        }
      }
      
      if (backup.data.categoriesChargePersonnalise) {
        for (const item of backup.data.categoriesChargePersonnalise) {
          await tx.categorieChargePersonnalise.create({ data: item });
          stats.categoriesChargePersonnalise++;
        }
      }
      
      if (backup.data.typesDocumentPersonnalise) {
        for (const item of backup.data.typesDocumentPersonnalise) {
          await tx.typeDocumentPersonnalise.create({ data: item });
          stats.typesDocumentPersonnalise++;
        }
      }
      
      if (backup.data.alertes) {
        for (const item of backup.data.alertes) {
          await tx.alerte.create({ 
            data: {
              ...item,
              type: item.type as TypeAlerte,
              priority: item.priority as PrioriteAlerte,
            }
          });
          stats.alertes++;
        }
      }
      
      // 2. Import chauffeurs BEFORE utilisateurs (utilisateurs can reference chauffeurs)
      if (backup.data.chauffeurs) {
        for (const item of backup.data.chauffeurs) {
          await tx.chauffeur.create({ 
            data: {
              ...item,
              typeContrat: item.typeContrat as TypeContrat,
              typeSalaire: item.typeSalaire as TypeSalaire,
            }
          });
          stats.chauffeurs++;
        }
      }
      
      // 3. Import utilisateurs (now chauffeurs exist for the foreign key)
      if (backup.data.utilisateurs) {
        for (const item of backup.data.utilisateurs) {
          await tx.utilisateur.create({ 
            data: {
              id: item.id,
              email: item.email,
              motDePasse: item.motDePasse,
              nom: item.nom,
              prenom: item.prenom,
              role: item.role as Role,
              actif: item.actif,
              chauffeurId: item.chauffeurId, // Now this will work because chauffeurs exist
              createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
            }
          });
          stats.utilisateurs++;
        }
      }
      
      // 4. Import vehicules (can reference chauffeurs)
      if (backup.data.vehicules) {
        for (const item of backup.data.vehicules) {
          await tx.vehicule.create({ 
            data: {
              ...item,
              typeCarburant: item.typeCarburant as TypeCarburant,
            }
          });
          stats.vehicules++;
        }
      }
      
      // 5. Import clients
      if (backup.data.clients) {
        for (const item of backup.data.clients) {
          await tx.client.create({ 
            data: {
              ...item,
              typeContrat: item.typeContrat as TypeContratClient,
            }
          });
          stats.clients++;
        }
      }
      
      // 6. Import services (reference clients)
      if (backup.data.services) {
        for (const item of backup.data.services) {
          await tx.service.create({ 
            data: {
              ...item,
              typeService: item.typeService as TypeService,
            }
          });
          stats.services++;
        }
      }
      
      // 7. Import servicesVehicule (reference services and vehicules)
      if (backup.data.servicesVehicule) {
        for (const item of backup.data.servicesVehicule) {
          await tx.serviceVehicule.create({ data: item });
          stats.servicesVehicule++;
        }
      }
      
      // 8. Import charges
      if (backup.data.charges) {
        for (const item of backup.data.charges) {
          await tx.charge.create({ 
            data: {
              ...item,
              type: item.type as TypeCharge,
              sourceType: item.sourceType as SourceCharge,
            }
          });
          stats.charges++;
        }
      }
      
      // 9. Import achatsVehicule
      if (backup.data.achatsVehicule) {
        for (const item of backup.data.achatsVehicule) {
          await tx.achatVehicule.create({ 
            data: {
              ...item,
              typeAchat: item.typeAchat as TypeAchat,
              frequencePaiement: item.frequencePaiement as FrequencePaiement,
              statut: item.statut as StatutAchat,
            }
          });
          stats.achatsVehicule++;
        }
      }
      
      // 10. Import echeancesCredit
      if (backup.data.echeancesCredit) {
        for (const item of backup.data.echeancesCredit) {
          await tx.echeanceCredit.create({ 
            data: {
              ...item,
              statut: item.statut as StatutEcheance,
            }
          });
          stats.echeancesCredit++;
        }
      }
      
      // 11. Import paiementsAchat
      if (backup.data.paiementsAchat) {
        for (const item of backup.data.paiementsAchat) {
          await tx.paiementAchat.create({ 
            data: {
              ...item,
              modePaiement: item.modePaiement as ModePaiementAchat,
            }
          });
          stats.paiementsAchat++;
        }
      }
      
      // 12. Import factures (reference clients)
      if (backup.data.factures) {
        for (const item of backup.data.factures) {
          await tx.facture.create({ 
            data: {
              ...item,
              statut: item.statut as StatutFacture,
            }
          });
          stats.factures++;
        }
      }
      
      // 13. Import exploitations (reference client, service, vehicule, chauffeur, facture)
      if (backup.data.exploitations) {
        for (const item of backup.data.exploitations) {
          await tx.exploitationService.create({ 
            data: {
              ...item,
              statut: item.statut as StatutService,
              etatPaiement: item.etatPaiement as EtatPaiement,
            }
          });
          stats.exploitations++;
        }
      }
      
      // 14. Import paiements (reference facture, client)
      if (backup.data.paiements) {
        for (const item of backup.data.paiements) {
          await tx.paiement.create({ 
            data: {
              ...item,
              mode: item.mode as ModePaiement,
            }
          });
          stats.paiements++;
        }
      }
      
      // 15. Import tournees (reference service, chauffeur)
      if (backup.data.tournees) {
        for (const item of backup.data.tournees) {
          await tx.tournee.create({ data: item });
          stats.tournees++;
        }
      }
      
      // 16. Import salaires (reference chauffeurs)
      if (backup.data.salaires) {
        for (const item of backup.data.salaires) {
          await tx.salaire.create({ data: item });
          stats.salaires++;
        }
      }
      
      // 17. Import primes
      if (backup.data.primes) {
        for (const item of backup.data.primes) {
          await tx.prime.create({ data: item });
          stats.primes++;
        }
      }
      
      // 18. Import avances
      if (backup.data.avances) {
        for (const item of backup.data.avances) {
          await tx.avance.create({ data: item });
          stats.avances++;
        }
      }
      
      // 19. Import documentsChauffeur
      if (backup.data.documentsChauffeur) {
        for (const item of backup.data.documentsChauffeur) {
          await tx.documentChauffeur.create({ data: item });
          stats.documentsChauffeur++;
        }
      }
      
      // 20. Import entretiens
      if (backup.data.entretiens) {
        for (const item of backup.data.entretiens) {
          await tx.entretien.create({ data: item });
          stats.entretiens++;
        }
      }
      
      // 21. Import pleinsCarburant
      if (backup.data.pleinsCarburant) {
        for (const item of backup.data.pleinsCarburant) {
          await tx.pleinCarburant.create({ data: item });
          stats.pleinsCarburant++;
        }
      }
      
      // 22. Import documentsVehicule
      if (backup.data.documentsVehicule) {
        for (const item of backup.data.documentsVehicule) {
          await tx.documentVehicule.create({ data: item });
          stats.documentsVehicule++;
        }
      }
      
      // 23. Import bulletinsPaie
      if (backup.data.bulletinsPaie) {
        for (const item of backup.data.bulletinsPaie) {
          await tx.bulletinPaie.create({ data: item });
          stats.bulletinsPaie++;
        }
      }
      
      // 24. Import logs (reference utilisateurs)
      if (backup.data.logs) {
        for (const item of backup.data.logs) {
          await tx.log.create({ data: item });
          stats.logs++;
        }
      }
      
      return stats;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Données importées avec succès',
      stats: result
    });
  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'import des données: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
