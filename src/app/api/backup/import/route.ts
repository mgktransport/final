// API pour importer les données de l'application
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  Role, TypeContrat, TypeSalaire, TypeCarburant, TypeAchat, 
  FrequencePaiement, StatutAchat, StatutEcheance, ModePaiementAchat, 
  TypeContratClient, TypeService, StatutService, EtatPaiement, 
  StatutFacture, ModePaiement, TypeAlerte, PrioriteAlerte, 
  TypeCharge, SourceCharge 
} from '@prisma/client';

// Helper to safely convert date strings to Date objects
function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

// Helper to safely get string or null
function toNullString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

// POST /api/backup/import - Import database data
export async function POST(request: NextRequest) {
  console.log('=== STARTING IMPORT PROCESS ===');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('ERROR: No file provided');
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }
    
    console.log('File received:', file.name, 'size:', file.size);
    
    const text = await file.text();
    let backup;
    
    try {
      backup = JSON.parse(text);
    } catch {
      console.log('ERROR: Invalid JSON format');
      return NextResponse.json(
        { success: false, error: 'Format JSON invalide' },
        { status: 400 }
      );
    }
    
    // Validate backup structure
    if (!backup.version || !backup.data) {
      console.log('ERROR: Invalid backup structure');
      return NextResponse.json(
        { success: false, error: 'Format de fichier invalide - version ou data manquant' },
        { status: 400 }
      );
    }
    
    console.log('Backup version:', backup.version);
    console.log('Export date:', backup.exportDate);
    console.log('Data sections found:', Object.keys(backup.data));
    
    // Count items in each section
    for (const [key, value] of Object.entries(backup.data)) {
      if (Array.isArray(value)) {
        console.log(`  - ${key}: ${value.length} items`);
      }
    }
    
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
    console.log('Clearing existing data...');
    try {
      await db.log.deleteMany();
      await db.bulletinPaie.deleteMany();
      await db.paiement.deleteMany();
      await db.facture.deleteMany();
      await db.exploitationService.deleteMany();
      await db.tournee.deleteMany();
      await db.serviceVehicule.deleteMany();
      await db.service.deleteMany();
      await db.client.deleteMany();
      await db.paiementAchat.deleteMany();
      await db.echeanceCredit.deleteMany();
      await db.achatVehicule.deleteMany();
      await db.documentVehicule.deleteMany();
      await db.pleinCarburant.deleteMany();
      await db.entretien.deleteMany();
      await db.vehicule.deleteMany();
      await db.typeDocumentPersonnalise.deleteMany();
      await db.documentChauffeur.deleteMany();
      await db.avance.deleteMany();
      await db.prime.deleteMany();
      await db.salaire.deleteMany();
      await db.chauffeur.deleteMany();
      await db.charge.deleteMany();
      await db.categorieChargePersonnalise.deleteMany();
      await db.alerte.deleteMany();
      await db.typeEntretienPersonnalise.deleteMany();
      await db.entreprise.deleteMany();
      await db.parametre.deleteMany();
      await db.utilisateur.deleteMany();
      console.log('Existing data cleared successfully');
    } catch (clearError) {
      console.error('Error clearing data:', clearError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors du nettoyage des données: ' + (clearError as Error).message },
        { status: 500 }
      );
    }
    
    // === IMPORT DATA IN CORRECT ORDER ===
    
    // 1. Parametres
    if (backup.data.parametres?.length > 0) {
      console.log('Importing parametres...');
      for (const item of backup.data.parametres) {
        try {
          await db.parametre.create({
            data: {
              id: item.id,
              cle: item.cle,
              valeur: item.valeur,
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.parametres++;
        } catch (e) {
          console.error('Error importing parametre:', item.id, e);
        }
      }
    }
    
    // 2. Entreprise
    if (backup.data.entreprise?.length > 0) {
      console.log('Importing entreprise...');
      for (const item of backup.data.entreprise) {
        try {
          await db.entreprise.create({
            data: {
              id: item.id,
              nom: item.nom,
              logo: toNullString(item.logo),
              adresse: toNullString(item.adresse),
              telephone: toNullString(item.telephone),
              email: toNullString(item.email),
              siteWeb: toNullString(item.siteWeb),
              siret: toNullString(item.siret),
              tvaIntracommunautaire: toNullString(item.tvaIntracommunautaire),
              rib: toNullString(item.rib),
              banque: toNullString(item.banque),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.entreprise++;
        } catch (e) {
          console.error('Error importing entreprise:', item.id, e);
        }
      }
    }
    
    // 3. TypesEntretienPersonnalise
    if (backup.data.typesEntretienPersonnalise?.length > 0) {
      console.log('Importing typesEntretienPersonnalise...');
      for (const item of backup.data.typesEntretienPersonnalise) {
        try {
          await db.typeEntretienPersonnalise.create({
            data: {
              id: item.id,
              code: item.code,
              nom: item.nom,
              description: toNullString(item.description),
              actif: item.actif ?? true,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.typesEntretienPersonnalise++;
        } catch (e) {
          console.error('Error importing typeEntretienPersonnalise:', item.id, e);
        }
      }
    }
    
    // 4. CategoriesChargePersonnalise
    if (backup.data.categoriesChargePersonnalise?.length > 0) {
      console.log('Importing categoriesChargePersonnalise...');
      for (const item of backup.data.categoriesChargePersonnalise) {
        try {
          await db.categorieChargePersonnalise.create({
            data: {
              id: item.id,
              code: item.code,
              nom: item.nom,
              type: item.type as TypeCharge,
              description: toNullString(item.description),
              actif: item.actif ?? true,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.categoriesChargePersonnalise++;
        } catch (e) {
          console.error('Error importing categorieChargePersonnalise:', item.id, e);
        }
      }
    }
    
    // 5. TypesDocumentPersonnalise
    if (backup.data.typesDocumentPersonnalise?.length > 0) {
      console.log('Importing typesDocumentPersonnalise...');
      for (const item of backup.data.typesDocumentPersonnalise) {
        try {
          await db.typeDocumentPersonnalise.create({
            data: {
              id: item.id,
              code: item.code,
              nom: item.nom,
              description: toNullString(item.description),
              categorie: item.categorie || 'CHAUFFEUR',
              actif: item.actif ?? true,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.typesDocumentPersonnalise++;
        } catch (e) {
          console.error('Error importing typeDocumentPersonnalise:', item.id, e);
        }
      }
    }
    
    // 6. Alertes
    if (backup.data.alertes?.length > 0) {
      console.log('Importing alertes...');
      for (const item of backup.data.alertes) {
        try {
          await db.alerte.create({
            data: {
              id: item.id,
              type: item.type as TypeAlerte,
              titre: item.titre,
              message: item.message,
              priority: item.priority as PrioriteAlerte,
              lu: item.lu ?? false,
              resolute: item.resolute ?? false,
              referenceId: toNullString(item.referenceId),
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.alertes++;
        } catch (e) {
          console.error('Error importing alerte:', item.id, e);
        }
      }
    }
    
    // 7. Chauffeurs (BEFORE utilisateurs)
    if (backup.data.chauffeurs?.length > 0) {
      console.log('Importing chauffeurs...');
      for (const item of backup.data.chauffeurs) {
        try {
          await db.chauffeur.create({
            data: {
              id: item.id,
              nom: item.nom,
              prenom: item.prenom,
              cin: item.cin,
              telephone: item.telephone,
              adresse: toNullString(item.adresse),
              numeroCNSS: toNullString(item.numeroCNSS),
              dateEmbauche: toDate(item.dateEmbauche) || new Date(),
              dateFinContrat: toDate(item.dateFinContrat),
              typeContrat: item.typeContrat as TypeContrat,
              typeSalaire: item.typeSalaire as TypeSalaire,
              montantSalaire: Number(item.montantSalaire) || 0,
              montantCNSS: Number(item.montantCNSS) || 0,
              montantAssurance: Number(item.montantAssurance) || 0,
              ribCompte: toNullString(item.ribCompte),
              actif: item.actif ?? true,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.chauffeurs++;
        } catch (e) {
          console.error('Error importing chauffeur:', item.id, e);
        }
      }
    }
    
    // 8. Utilisateurs
    if (backup.data.utilisateurs?.length > 0) {
      console.log('Importing utilisateurs...');
      for (const item of backup.data.utilisateurs) {
        try {
          await db.utilisateur.create({
            data: {
              id: item.id,
              email: item.email,
              motDePasse: item.motDePasse,
              nom: item.nom,
              prenom: item.prenom,
              role: item.role as Role,
              actif: item.actif ?? true,
              chauffeurId: toNullString(item.chauffeurId),
              mustChangePassword: item.mustChangePassword ?? false,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.utilisateurs++;
        } catch (e) {
          console.error('Error importing utilisateur:', item.id, e);
        }
      }
    }
    
    // 9. Vehicules
    if (backup.data.vehicules?.length > 0) {
      console.log('Importing vehicules...');
      for (const item of backup.data.vehicules) {
        try {
          await db.vehicule.create({
            data: {
              id: item.id,
              immatriculation: item.immatriculation,
              marque: item.marque,
              modele: item.modele,
              annee: Number(item.annee) || 2020,
              typeCarburant: item.typeCarburant as TypeCarburant,
              capacite: Number(item.capacite) || 0,
              kilometrage: Number(item.kilometrage) || 0,
              actif: item.actif ?? true,
              chauffeurId: toNullString(item.chauffeurId),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.vehicules++;
        } catch (e) {
          console.error('Error importing vehicule:', item.id, e);
        }
      }
    }
    
    // 10. Clients
    if (backup.data.clients?.length > 0) {
      console.log('Importing clients...');
      for (const item of backup.data.clients) {
        try {
          await db.client.create({
            data: {
              id: item.id,
              nomEntreprise: item.nomEntreprise,
              contact: toNullString(item.contact),
              telephone: item.telephone,
              email: toNullString(item.email),
              adresse: toNullString(item.adresse),
              typeContrat: item.typeContrat as TypeContratClient,
              dateFinContrat: toDate(item.dateFinContrat),
              alerteEnvoyee: item.alerteEnvoyee ?? false,
              actif: item.actif ?? true,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.clients++;
        } catch (e) {
          console.error('Error importing client:', item.id, e);
        }
      }
    }
    
    // 11. Services
    if (backup.data.services?.length > 0) {
      console.log('Importing services...');
      for (const item of backup.data.services) {
        try {
          await db.service.create({
            data: {
              id: item.id,
              clientId: item.clientId,
              typeService: item.typeService as TypeService,
              nomService: item.nomService,
              description: toNullString(item.description),
              lieuDepart: toNullString(item.lieuDepart),
              lieuArrive: toNullString(item.lieuArrive),
              heureDepart: toNullString(item.heureDepart),
              tarif: Number(item.tarif) || 0,
              nombreSalariesMin: Number(item.nombreSalariesMin) || 1,
              actif: item.actif ?? true,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.services++;
        } catch (e) {
          console.error('Error importing service:', item.id, e);
        }
      }
    }
    
    // 12. ServicesVehicule
    if (backup.data.servicesVehicule?.length > 0) {
      console.log('Importing servicesVehicule...');
      for (const item of backup.data.servicesVehicule) {
        try {
          await db.serviceVehicule.create({
            data: {
              serviceId: item.serviceId,
              vehiculeId: item.vehiculeId,
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.servicesVehicule++;
        } catch (e) {
          console.error('Error importing serviceVehicule:', item, e);
        }
      }
    }
    
    // 13. Charges
    if (backup.data.charges?.length > 0) {
      console.log('Importing charges...');
      for (const item of backup.data.charges) {
        try {
          await db.charge.create({
            data: {
              id: item.id,
              type: item.type as TypeCharge,
              categorie: item.categorie,
              description: item.description,
              montant: Number(item.montant) || 0,
              dateCharge: toDate(item.dateCharge) || new Date(),
              vehiculeId: toNullString(item.vehiculeId),
              automatique: item.automatique ?? false,
              sourceType: item.sourceType as SourceCharge,
              sourceId: toNullString(item.sourceId),
              chauffeurId: toNullString(item.chauffeurId),
              fournisseur: toNullString(item.fournisseur),
              numeroFacture: toNullString(item.numeroFacture),
              fichier: toNullString(item.fichier),
              notes: toNullString(item.notes),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.charges++;
        } catch (e) {
          console.error('Error importing charge:', item.id, e);
        }
      }
    }
    
    // 14. AchatsVehicule
    if (backup.data.achatsVehicule?.length > 0) {
      console.log('Importing achatsVehicule...');
      for (const item of backup.data.achatsVehicule) {
        try {
          await db.achatVehicule.create({
            data: {
              id: item.id,
              vehiculeId: item.vehiculeId,
              typeAchat: item.typeAchat as TypeAchat,
              dateAchat: toDate(item.dateAchat) || new Date(),
              montantTotal: Number(item.montantTotal) || 0,
              acompte: Number(item.acompte) || 0,
              fournisseur: toNullString(item.fournisseur),
              adresseFournisseur: toNullString(item.adresseFournisseur),
              telephoneFournisseur: toNullString(item.telephoneFournisseur),
              numeroFacture: toNullString(item.numeroFacture),
              observations: toNullString(item.observations),
              nombreEcheances: item.nombreEcheances ? Number(item.nombreEcheances) : null,
              montantEcheance: item.montantEcheance ? Number(item.montantEcheance) : null,
              datePremiereEcheance: toDate(item.datePremiereEcheance),
              frequencePaiement: item.frequencePaiement as FrequencePaiement,
              statut: item.statut as StatutAchat,
              montantPaye: Number(item.montantPaye) || 0,
              montantRestant: Number(item.montantRestant) || 0,
              dateDernierPaiement: toDate(item.dateDernierPaiement),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.achatsVehicule++;
        } catch (e) {
          console.error('Error importing achatVehicule:', item.id, e);
        }
      }
    }
    
    // 15. EcheancesCredit
    if (backup.data.echeancesCredit?.length > 0) {
      console.log('Importing echeancesCredit...');
      for (const item of backup.data.echeancesCredit) {
        try {
          await db.echeanceCredit.create({
            data: {
              id: item.id,
              achatVehiculeId: item.achatVehiculeId,
              numeroEcheance: Number(item.numeroEcheance) || 1,
              dateEcheance: toDate(item.dateEcheance) || new Date(),
              montantEcheance: Number(item.montantEcheance) || 0,
              montantPaye: Number(item.montantPaye) || 0,
              datePaiement: toDate(item.datePaiement),
              statut: item.statut as StatutEcheance,
              observations: toNullString(item.observations),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.echeancesCredit++;
        } catch (e) {
          console.error('Error importing echeanceCredit:', item.id, e);
        }
      }
    }
    
    // 16. PaiementsAchat
    if (backup.data.paiementsAchat?.length > 0) {
      console.log('Importing paiementsAchat...');
      for (const item of backup.data.paiementsAchat) {
        try {
          await db.paiementAchat.create({
            data: {
              id: item.id,
              achatVehiculeId: item.achatVehiculeId,
              datePaiement: toDate(item.datePaiement) || new Date(),
              montant: Number(item.montant) || 0,
              modePaiement: item.modePaiement as ModePaiementAchat,
              reference: toNullString(item.reference),
              observations: toNullString(item.observations),
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.paiementsAchat++;
        } catch (e) {
          console.error('Error importing paiementAchat:', item.id, e);
        }
      }
    }
    
    // 17. Factures
    if (backup.data.factures?.length > 0) {
      console.log('Importing factures...');
      for (const item of backup.data.factures) {
        try {
          await db.facture.create({
            data: {
              id: item.id,
              numero: item.numero,
              clientId: item.clientId,
              dateEmission: toDate(item.dateEmission) || new Date(),
              dateEcheance: toDate(item.dateEcheance) || new Date(),
              montantHT: Number(item.montantHT) || 0,
              tauxTVA: Number(item.tauxTVA) || 20,
              montantTVA: Number(item.montantTVA) || 0,
              montantTTC: Number(item.montantTTC) || 0,
              statut: item.statut as StatutFacture,
              rappelsEnvoyes: Number(item.rappelsEnvoyes) || 0,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.factures++;
        } catch (e) {
          console.error('Error importing facture:', item.id, e);
        }
      }
    }
    
    // 18. Exploitations
    if (backup.data.exploitations?.length > 0) {
      console.log('Importing exploitations...');
      for (const item of backup.data.exploitations) {
        try {
          await db.exploitationService.create({
            data: {
              id: item.id,
              clientId: item.clientId,
              serviceId: item.serviceId,
              vehiculeId: item.vehiculeId,
              chauffeurId: item.chauffeurId,
              dateHeureDepart: toDate(item.dateHeureDepart) || new Date(),
              nombreSalaries: Number(item.nombreSalaries) || 1,
              statut: item.statut as StatutService,
              completed: item.completed ?? false,
              etatPaiement: item.etatPaiement as EtatPaiement,
              factureId: toNullString(item.factureId),
              notes: toNullString(item.notes),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.exploitations++;
        } catch (e) {
          console.error('Error importing exploitation:', item.id, e);
        }
      }
    }
    
    // 19. Paiements (factures)
    if (backup.data.paiements?.length > 0) {
      console.log('Importing paiements...');
      for (const item of backup.data.paiements) {
        try {
          await db.paiement.create({
            data: {
              id: item.id,
              factureId: item.factureId,
              clientId: item.clientId,
              montant: Number(item.montant) || 0,
              mode: item.mode as ModePaiement,
              reference: toNullString(item.reference),
              date: toDate(item.date) || new Date(),
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.paiements++;
        } catch (e) {
          console.error('Error importing paiement:', item.id, e);
        }
      }
    }
    
    // 20. Tournees
    if (backup.data.tournees?.length > 0) {
      console.log('Importing tournees...');
      for (const item of backup.data.tournees) {
        try {
          await db.tournee.create({
            data: {
              id: item.id,
              serviceId: item.serviceId,
              chauffeurId: item.chauffeurId,
              date: toDate(item.date) || new Date(),
              completed: item.completed ?? false,
              notes: toNullString(item.notes),
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.tournees++;
        } catch (e) {
          console.error('Error importing tournee:', item.id, e);
        }
      }
    }
    
    // 21. Salaires
    if (backup.data.salaires?.length > 0) {
      console.log('Importing salaires...');
      for (const item of backup.data.salaires) {
        try {
          await db.salaire.create({
            data: {
              id: item.id,
              chauffeurId: item.chauffeurId,
              mois: Number(item.mois) || 1,
              annee: Number(item.annee) || 2024,
              heuresTravaillees: item.heuresTravaillees ? Number(item.heuresTravaillees) : null,
              joursTravailles: item.joursTravailles ? Number(item.joursTravailles) : null,
              montantBase: Number(item.montantBase) || 0,
              montantPrimes: Number(item.montantPrimes) || 0,
              montantAvances: Number(item.montantAvances) || 0,
              montantNet: Number(item.montantNet) || 0,
              paye: item.paye ?? false,
              datePaiement: toDate(item.datePaiement),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.salaires++;
        } catch (e) {
          console.error('Error importing salaire:', item.id, e);
        }
      }
    }
    
    // 22. Primes
    if (backup.data.primes?.length > 0) {
      console.log('Importing primes...');
      for (const item of backup.data.primes) {
        try {
          await db.prime.create({
            data: {
              id: item.id,
              chauffeurId: item.chauffeurId,
              motif: item.motif,
              montant: Number(item.montant) || 0,
              date: toDate(item.date) || new Date(),
              comptabilise: item.comptabilise ?? false,
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.primes++;
        } catch (e) {
          console.error('Error importing prime:', item.id, e);
        }
      }
    }
    
    // 23. Avances
    if (backup.data.avances?.length > 0) {
      console.log('Importing avances...');
      for (const item of backup.data.avances) {
        try {
          await db.avance.create({
            data: {
              id: item.id,
              chauffeurId: item.chauffeurId,
              montant: Number(item.montant) || 0,
              date: toDate(item.date) || new Date(),
              rembourse: item.rembourse ?? false,
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.avances++;
        } catch (e) {
          console.error('Error importing avance:', item.id, e);
        }
      }
    }
    
    // 24. DocumentsChauffeur
    if (backup.data.documentsChauffeur?.length > 0) {
      console.log('Importing documentsChauffeur...');
      for (const item of backup.data.documentsChauffeur) {
        try {
          await db.documentChauffeur.create({
            data: {
              id: item.id,
              chauffeurId: item.chauffeurId,
              type: item.type,
              numero: toNullString(item.numero),
              dateEmission: toDate(item.dateEmission),
              dateExpiration: toDate(item.dateExpiration),
              fichier: toNullString(item.fichier),
              alerteEnvoyee: item.alerteEnvoyee ?? false,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.documentsChauffeur++;
        } catch (e) {
          console.error('Error importing documentChauffeur:', item.id, e);
        }
      }
    }
    
    // 25. Entretiens
    if (backup.data.entretiens?.length > 0) {
      console.log('Importing entretiens...');
      for (const item of backup.data.entretiens) {
        try {
          await db.entretien.create({
            data: {
              id: item.id,
              vehiculeId: item.vehiculeId,
              type: item.type,
              description: toNullString(item.description),
              cout: Number(item.cout) || 0,
              kilometrage: item.kilometrage ? Number(item.kilometrage) : null,
              dateIntervention: toDate(item.dateIntervention) || new Date(),
              prochainKm: item.prochainKm ? Number(item.prochainKm) : null,
              prochaineDate: toDate(item.prochaineDate),
              alerteEnvoyee: item.alerteEnvoyee ?? false,
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.entretiens++;
        } catch (e) {
          console.error('Error importing entretien:', item.id, e);
        }
      }
    }
    
    // 26. PleinsCarburant
    if (backup.data.pleinsCarburant?.length > 0) {
      console.log('Importing pleinsCarburant...');
      for (const item of backup.data.pleinsCarburant) {
        try {
          await db.pleinCarburant.create({
            data: {
              id: item.id,
              vehiculeId: item.vehiculeId,
              quantite: Number(item.quantite) || 0,
              prixUnitaire: Number(item.prixUnitaire) || 0,
              prixTotal: Number(item.prixTotal) || 0,
              station: toNullString(item.station),
              kilometrage: Number(item.kilometrage) || 0,
              date: toDate(item.date) || new Date(),
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.pleinsCarburant++;
        } catch (e) {
          console.error('Error importing pleinCarburant:', item.id, e);
        }
      }
    }
    
    // 27. DocumentsVehicule
    if (backup.data.documentsVehicule?.length > 0) {
      console.log('Importing documentsVehicule...');
      for (const item of backup.data.documentsVehicule) {
        try {
          await db.documentVehicule.create({
            data: {
              id: item.id,
              vehiculeId: item.vehiculeId,
              type: item.type,
              numero: toNullString(item.numero),
              dateEmission: toDate(item.dateEmission),
              dateExpiration: toDate(item.dateExpiration),
              fichier: toNullString(item.fichier),
              alerteEnvoyee: item.alerteEnvoyee ?? false,
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.documentsVehicule++;
        } catch (e) {
          console.error('Error importing documentVehicule:', item.id, e);
        }
      }
    }
    
    // 28. BulletinsPaie
    if (backup.data.bulletinsPaie?.length > 0) {
      console.log('Importing bulletinsPaie...');
      for (const item of backup.data.bulletinsPaie) {
        try {
          await db.bulletinPaie.create({
            data: {
              id: item.id,
              chauffeurId: item.chauffeurId,
              mois: Number(item.mois) || 1,
              annee: Number(item.annee) || 2024,
              salaireBase: Number(item.salaireBase) || 0,
              heuresSupplementaires: Number(item.heuresSupplementaires) || 0,
              primeTrajet: Number(item.primeTrajet) || 0,
              primeRendement: Number(item.primeRendement) || 0,
              indemniteDeplacement: Number(item.indemniteDeplacement) || 0,
              indemnitePanier: Number(item.indemnitePanier) || 0,
              autresPrimes: Number(item.autresPrimes) || 0,
              salaireBrut: Number(item.salaireBrut) || 0,
              cnss: Number(item.cnss) || 0,
              amo: Number(item.amo) || 0,
              ir: Number(item.ir) || 0,
              avanceSalaire: Number(item.avanceSalaire) || 0,
              autresRetenues: Number(item.autresRetenues) || 0,
              totalRetenues: Number(item.totalRetenues) || 0,
              salaireNet: Number(item.salaireNet) || 0,
              dateGeneration: toDate(item.dateGeneration) || new Date(),
              imprime: item.imprime ?? false,
              dateImpression: toDate(item.dateImpression),
              createdAt: toDate(item.createdAt) || new Date(),
              updatedAt: toDate(item.updatedAt) || new Date(),
            }
          });
          stats.bulletinsPaie++;
        } catch (e) {
          console.error('Error importing bulletinPaie:', item.id, e);
        }
      }
    }
    
    // 29. Logs
    if (backup.data.logs?.length > 0) {
      console.log('Importing logs...');
      for (const item of backup.data.logs) {
        try {
          await db.log.create({
            data: {
              id: item.id,
              action: item.action,
              details: toNullString(item.details),
              utilisateurId: item.utilisateurId,
              createdAt: toDate(item.createdAt) || new Date(),
            }
          });
          stats.logs++;
        } catch (e) {
          console.error('Error importing log:', item.id, e);
        }
      }
    }
    
    console.log('=== IMPORT COMPLETED ===');
    console.log('Final stats:', stats);
    
    return NextResponse.json({
      success: true,
      message: 'Données importées avec succès',
      stats: stats
    });
    
  } catch (error) {
    console.error('=== IMPORT ERROR ===');
    console.error('Error details:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'import des données: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
