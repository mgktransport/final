// Script d'initialisation des données pour MGK Transport
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initialisation des données MGK Transport...\n');

  // 1. Paramètres de l'entreprise
  console.log('📋 Création des paramètres entreprise...');
  const parametres = [
    { cle: 'ENTREPRISE_NOM', valeur: 'MGK Transport' },
    { cle: 'ENTREPRISE_ICE', valeur: '001234567000089' },
    { cle: 'ENTREPRISE_ADRESSE', valeur: '123 Avenue Mohammed V, Casablanca, Maroc' },
    { cle: 'ENTREPRISE_VILLE', valeur: 'Casablanca' },
    { cle: 'ENTREPRISE_TELEPHONE', valeur: '+212 522 123 456' },
    { cle: 'ENTREPRISE_EMAIL', valeur: 'contact@mgktransport.ma' },
    { cle: 'ENTREPRISE_RC', valeur: 'RC123456' },
    { cle: 'ENTREPRISE_IF', valeur: 'IF789012' },
    { cle: 'ENTREPRISE_COMPTE_BANCAIRE', valeur: '011 780 000012345678901234' },
    { cle: 'ENTREPRISE_SITE_WEB', valeur: 'www.mgktransport.ma' },
    { cle: 'NOTIF_DOCUMENT_EXPIRATION', valeur: 'true' },
    { cle: 'NOTIF_DOCUMENT_DAYS', valeur: '30' },
    { cle: 'NOTIF_FACTURE_RETARD', valeur: 'true' },
    { cle: 'NOTIF_FACTURE_DAYS', valeur: '7' },
    { cle: 'NOTIF_ENTRETIEN', valeur: 'true' },
    { cle: 'NOTIF_ENTRETIEN_DAYS', valeur: '15' },
    { cle: 'NOTIF_CONTRAT_CDD', valeur: 'true' },
    { cle: 'NOTIF_CONTRAT_CDD_DAYS', valeur: '30' },
    { cle: 'NOTIF_CONTRAT_CLIENT', valeur: 'true' },
    { cle: 'NOTIF_CONTRAT_CLIENT_DAYS', valeur: '30' },
    { cle: 'NOTIF_PUSH_ENABLED', valeur: 'true' },
    { cle: 'NOTIF_SOUND_ENABLED', valeur: 'true' },
  ];

  for (const param of parametres) {
    await prisma.parametre.upsert({
      where: { cle: param.cle },
      update: { valeur: param.valeur },
      create: param,
    });
  }
  console.log('✅ Paramètres entreprise créés\n');

  // 2. Types d'entretien personnalisés
  console.log('🔧 Création des types d\'entretien personnalisés...');
  const typesEntretien = [
    { code: 'COURROIE', nom: 'Courroie de distribution', description: 'Remplacement courroie de distribution' },
    { code: 'BATTERIE', nom: 'Batterie', description: 'Remplacement ou recharge batterie' },
    { code: 'CLIMATISATION', nom: 'Climatisation', description: 'Entretien système climatisation' },
  ];

  for (const type of typesEntretien) {
    await prisma.typeEntretienPersonnalise.upsert({
      where: { code: type.code },
      update: type,
      create: type,
    });
  }
  console.log('✅ Types d\'entretien créés\n');

  // 3. Types de documents personnalisés
  console.log('📄 Création des types de documents personnalisés...');
  const typesDocs = [
    { code: 'ATTESTATION_FORMATION', nom: 'Attestation de formation', description: 'Attestation de formation chauffeur', categorie: 'CHAUFFEUR' },
    { code: 'ATTESTATION_EXPERIENCE', nom: 'Attestation d\'expérience', description: 'Attestation d\'expérience professionnelle', categorie: 'CHAUFFEUR' },
    { code: 'LICENCE_TRANSPORT', nom: 'Licence de transport', description: 'Licence de transport de personnes', categorie: 'VEHICULE' },
  ];

  for (const type of typesDocs) {
    await prisma.typeDocumentPersonnalise.upsert({
      where: { code: type.code },
      update: type,
      create: type,
    });
  }
  console.log('✅ Types de documents créés\n');

  // 4. Catégories de charges par défaut
  console.log('💰 Création des catégories de charges par défaut...');
  const categoriesCharges = [
    // Catégories VÉHICULE
    { code: 'LAVAGE', nom: 'Lavage', type: 'VEHICULE', description: 'Lavage et nettoyage de véhicule' },
    { code: 'PARKING', nom: 'Parking', type: 'VEHICULE', description: 'Frais de stationnement' },
    { code: 'PEAGE', nom: 'Péage', type: 'VEHICULE', description: 'Frais de péage autoroutier' },
    // Catégories SOCIÉTÉ
    { code: 'FOURNITURES', nom: 'Fournitures', type: 'SOCIETE', description: 'Fournitures de bureau et matériel' },
    { code: 'FRAIS_BANCAIRES', nom: 'Frais bancaires', type: 'SOCIETE', description: 'Commissions et frais bancaires' },
    { code: 'ELECTRICITE', nom: 'Électricité', type: 'SOCIETE', description: 'Factures d\'électricité' },
    { code: 'EAU', nom: 'Eau', type: 'SOCIETE', description: 'Factures d\'eau' },
    { code: 'INTERNET', nom: 'Internet', type: 'SOCIETE', description: 'Abonnement internet' },
    { code: 'TELEPHONE', nom: 'Téléphone', type: 'SOCIETE', description: 'Factures téléphoniques' },
    { code: 'LOYER', nom: 'Loyer', type: 'SOCIETE', description: 'Loyer des locaux' },
    { code: 'ASSURANCE_SOCIETE', nom: 'Assurance société', type: 'SOCIETE', description: 'Assurances responsabilité civile, locaux' },
  ];

  for (const cat of categoriesCharges) {
    await prisma.categorieChargePersonnalise.upsert({
      where: { code: cat.code },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ ${categoriesCharges.length} catégories de charges créées\n`);

  // 5. Chauffeurs
  console.log('👨‍✈️ Création des chauffeurs...');
  const chauffeurs = await Promise.all([
    prisma.chauffeur.upsert({
      where: { cin: 'AB123456' },
      update: {},
      create: {
        nom: 'Alami',
        prenom: 'Mohammed',
        cin: 'AB123456',
        telephone: '+212 661 123 456',
        adresse: '45 Rue Hassan II, Casablanca',
        dateEmbauche: new Date('2020-01-15'),
        typeContrat: 'CDI',
        typeSalaire: 'FIXE',
        montantSalaire: 5000,
        montantCNSS: 200,
        montantAssurance: 150,
        ribCompte: '011780000012345678901234',
        actif: true,
      },
    }),
    prisma.chauffeur.upsert({
      where: { cin: 'CD789012' },
      update: {},
      create: {
        nom: 'Benali',
        prenom: 'Ahmed',
        cin: 'CD789012',
        telephone: '+212 662 234 567',
        adresse: '78 Boulevard Mohammed V, Rabat',
        dateEmbauche: new Date('2021-03-01'),
        typeContrat: 'CDI',
        typeSalaire: 'HORAIRE',
        montantSalaire: 35,
        montantCNSS: 200,
        montantAssurance: 150,
        actif: true,
      },
    }),
    prisma.chauffeur.upsert({
      where: { cin: 'EF345678' },
      update: {},
      create: {
        nom: 'Chraibi',
        prenom: 'Karim',
        cin: 'EF345678',
        telephone: '+212 663 345 678',
        adresse: '12 Avenue Allal Ben Abdellah, Fès',
        dateEmbauche: new Date('2022-06-15'),
        typeContrat: 'CDD',
        typeSalaire: 'PAR_TOURNEE',
        montantSalaire: 150,
        montantCNSS: 200,
        montantAssurance: 150,
        actif: true,
      },
    }),
    prisma.chauffeur.upsert({
      where: { cin: 'GH901234' },
      update: {},
      create: {
        nom: 'Dahbi',
        prenom: 'Youssef',
        cin: 'GH901234',
        telephone: '+212 664 456 789',
        adresse: '34 Rue Moulay Ismail, Marrakech',
        dateEmbauche: new Date('2023-01-10'),
        typeContrat: 'JOURNALIER',
        typeSalaire: 'HORAIRE',
        montantSalaire: 40,
        montantCNSS: 0,
        montantAssurance: 100,
        actif: true,
      },
    }),
    prisma.chauffeur.upsert({
      where: { cin: 'IJ567890' },
      update: {},
      create: {
        nom: 'El Fassi',
        prenom: 'Hassan',
        cin: 'IJ567890',
        telephone: '+212 665 567 890',
        adresse: '56 Avenue Hassan I, Tanger',
        dateEmbauche: new Date('2019-09-01'),
        typeContrat: 'CDI',
        typeSalaire: 'FIXE',
        montantSalaire: 5500,
        montantCNSS: 220,
        montantAssurance: 160,
        ribCompte: '011780000098765432109876',
        actif: false,
      },
    }),
  ]);
  console.log(`✅ ${chauffeurs.length} chauffeurs créés\n`);

  // 5. Documents chauffeurs
  console.log('📄 Création des documents chauffeurs...');
  const now = new Date();
  const futureDate = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const pastDate = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  for (const chauffeur of chauffeurs.slice(0, 4)) {
    // Check if documents already exist
    const existingDocs = await prisma.documentChauffeur.findMany({
      where: { chauffeurId: chauffeur.id }
    });
    
    if (existingDocs.length === 0) {
      await prisma.documentChauffeur.createMany({
        data: [
          {
            chauffeurId: chauffeur.id,
            type: 'PERMIS_CONDUIRE',
            numero: `PERMIS-${chauffeur.cin}`,
            dateExpiration: futureDate(365),
          },
          {
            chauffeurId: chauffeur.id,
            type: 'VISITE_MEDICALE',
            numero: `VM-${chauffeur.cin}`,
            dateExpiration: futureDate(180),
          },
          {
            chauffeurId: chauffeur.id,
            type: 'CIN',
            numero: chauffeur.cin,
            dateExpiration: futureDate(3650),
          },
        ],
      });
    }
  }
  console.log('✅ Documents chauffeurs créés\n');

  // 6. Primes et avances
  console.log('💰 Création des primes et avances...');
  for (const chauffeur of chauffeurs.slice(0, 3)) {
    const existingPrimes = await prisma.prime.findMany({
      where: { chauffeurId: chauffeur.id }
    });
    if (existingPrimes.length === 0) {
      await prisma.prime.createMany({
        data: [
          { chauffeurId: chauffeur.id, motif: 'Prime d\'assiduité', montant: 500, date: pastDate(15), comptabilise: false },
          { chauffeurId: chauffeur.id, motif: 'Prime de performance', montant: 800, date: pastDate(45), comptabilise: true },
        ],
      });
    }

    const existingAvances = await prisma.avance.findMany({
      where: { chauffeurId: chauffeur.id }
    });
    if (existingAvances.length === 0) {
      await prisma.avance.createMany({
        data: [
          { chauffeurId: chauffeur.id, montant: 1000, date: pastDate(20), rembourse: false },
          { chauffeurId: chauffeur.id, montant: 500, date: pastDate(60), rembourse: true },
        ],
      });
    }
  }
  console.log('✅ Primes et avances créées\n');

  // 7. Véhicules
  console.log('🚛 Création des véhicules...');
  const vehicules = await Promise.all([
    prisma.vehicule.upsert({
      where: { immatriculation: '12345-A-1' },
      update: {},
      create: {
        immatriculation: '12345-A-1',
        marque: 'Mercedes',
        modele: 'Sprinter 515',
        annee: 2020,
        capacite: 18,
        kilometrage: 125000,
        actif: true,
        chauffeurId: chauffeurs[0].id,
      },
    }),
    prisma.vehicule.upsert({
      where: { immatriculation: '23456-B-2' },
      update: {},
      create: {
        immatriculation: '23456-B-2',
        marque: 'Iveco',
        modele: 'Daily 35C15',
        annee: 2021,
        capacite: 22,
        kilometrage: 85000,
        actif: true,
        chauffeurId: chauffeurs[1].id,
      },
    }),
    prisma.vehicule.upsert({
      where: { immatriculation: '34567-C-3' },
      update: {},
      create: {
        immatriculation: '34567-C-3',
        marque: 'Renault',
        modele: 'Master L3H2',
        annee: 2019,
        capacite: 15,
        kilometrage: 180000,
        actif: true,
        chauffeurId: chauffeurs[2].id,
      },
    }),
    prisma.vehicule.upsert({
      where: { immatriculation: '45678-D-4' },
      update: {},
      create: {
        immatriculation: '45678-D-4',
        marque: 'Ford',
        modele: 'Transit Custom',
        annee: 2022,
        capacite: 9,
        kilometrage: 45000,
        actif: true,
        chauffeurId: chauffeurs[3].id,
      },
    }),
    prisma.vehicule.upsert({
      where: { immatriculation: '56789-E-5' },
      update: {},
      create: {
        immatriculation: '56789-E-5',
        marque: 'Volkswagen',
        modele: 'Crafter 35',
        annee: 2018,
        capacite: 20,
        kilometrage: 220000,
        actif: false,
      },
    }),
  ]);
  console.log(`✅ ${vehicules.length} véhicules créés\n`);

  // 8. Documents véhicules
  console.log('📄 Création des documents véhicules...');
  for (const vehicule of vehicules.slice(0, 4)) {
    const existingDocs = await prisma.documentVehicule.findMany({
      where: { vehiculeId: vehicule.id }
    });
    
    if (existingDocs.length === 0) {
      await prisma.documentVehicule.createMany({
        data: [
          {
            vehiculeId: vehicule.id,
            type: 'ASSURANCE',
            numero: `ASS-${vehicule.immatriculation}`,
            dateExpiration: futureDate(180),
          },
          {
            vehiculeId: vehicule.id,
            type: 'VISITE_TECHNIQUE',
            numero: `VT-${vehicule.immatriculation}`,
            dateExpiration: futureDate(90),
          },
          {
            vehiculeId: vehicule.id,
            type: 'CARTE_GRISE',
            numero: `CG-${vehicule.immatriculation}`,
          },
        ],
      });
    }
  }
  console.log('✅ Documents véhicules créés\n');

  // 9. Entretiens
  console.log('🔧 Création des entretiens...');
  for (const vehicule of vehicules.slice(0, 4)) {
    const existingEntretiens = await prisma.entretien.findMany({
      where: { vehiculeId: vehicule.id }
    });
    
    if (existingEntretiens.length === 0) {
      await prisma.entretien.createMany({
        data: [
          {
            vehiculeId: vehicule.id,
            type: 'VIDANGE',
            description: 'Vidange huile moteur + filtre',
            cout: 800,
            kilometrage: vehicule.kilometrage - 10000,
            dateIntervention: pastDate(30),
            prochainKm: vehicule.kilometrage + 5000,
            prochaineDate: futureDate(90),
          },
          {
            vehiculeId: vehicule.id,
            type: 'PNEUS',
            description: 'Remplacement 2 pneus avant',
            cout: 1500,
            kilometrage: vehicule.kilometrage - 25000,
            dateIntervention: pastDate(90),
          },
        ],
      });
    }
  }
  console.log('✅ Entretiens créés\n');

  // 10. Pleins carburant
  console.log('⛽ Création des pleins carburant...');
  const stations = ['Afriquia', 'Shell', 'Total', 'Winxo'];
  for (const vehicule of vehicules.slice(0, 4)) {
    for (let i = 0; i < 5; i++) {
      const existingPlein = await prisma.pleinCarburant.findFirst({
        where: {
          vehiculeId: vehicule.id,
          date: pastDate(i * 7)
        }
      });

      if (!existingPlein) {
        const quantite = 50 + Math.random() * 30;
        const prixUnitaire = 10.5 + Math.random() * 2;
        await prisma.pleinCarburant.create({
          data: {
            vehiculeId: vehicule.id,
            quantite: quantite,
            prixUnitaire: prixUnitaire,
            prixTotal: quantite * prixUnitaire,
            station: stations[Math.floor(Math.random() * 4)],
            kilometrage: vehicule.kilometrage - i * 1000,
            date: pastDate(i * 7),
          },
        });
      }
    }
  }
  console.log('✅ Pleins carburant créés\n');

  // 11. Clients
  console.log('🏢 Création des clients...');
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: 'client-1' },
      update: {},
      create: {
        id: 'client-1',
        nomEntreprise: 'Atlas Industries',
        contact: 'M. Rachid Tazi',
        telephone: '+212 535 123 456',
        email: 'contact@atlasindustries.ma',
        adresse: 'Zone industrielle, Casablanca',
        typeContrat: 'MENSUEL',
        actif: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-2' },
      update: {},
      create: {
        id: 'client-2',
        nomEntreprise: 'Maroc Pharma',
        contact: 'Mme. Fatima Zahra',
        telephone: '+212 537 234 567',
        email: 'logistique@marocpharma.ma',
        adresse: 'Route de Rabat, Salé',
        typeContrat: 'ANNUEL',
        actif: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-3' },
      update: {},
      create: {
        id: 'client-3',
        nomEntreprise: 'Tanger Logistique',
        contact: 'M. Ahmed Bennani',
        telephone: '+212 539 345 678',
        email: 'transport@tangerlog.ma',
        adresse: 'Port Tanger Med',
        typeContrat: 'MENSUEL',
        actif: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-4' },
      update: {},
      create: {
        id: 'client-4',
        nomEntreprise: 'Sud Express',
        contact: 'M. Khalid Amrani',
        telephone: '+212 524 456 789',
        email: 'info@sudexpress.ma',
        adresse: 'Avenue Mohammed V, Marrakech',
        typeContrat: 'PONCTUEL',
        actif: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-5' },
      update: {},
      create: {
        id: 'client-5',
        nomEntreprise: 'Express Service',
        contact: 'M. Omar Idrissi',
        telephone: '+212 535 567 890',
        email: 'contact@expressservice.ma',
        adresse: 'Zone industrielle, Fès',
        typeContrat: 'ANNUEL',
        actif: false,
      },
    }),
  ]);
  console.log(`✅ ${clients.length} clients créés\n`);

  // 12. Services
  console.log('🚐 Création des services...');
  for (const client of clients.slice(0, 4)) {
    const existingServices = await prisma.service.findMany({
      where: { clientId: client.id }
    });

    if (existingServices.length === 0) {
      await prisma.service.createMany({
        data: [
          {
            clientId: client.id,
            typeService: 'TRAJET_JOURNALIER',
            nomService: 'Navette matin - Zone industrielle',
            description: 'Navette régulière pour le personnel',
            lieuDepart: 'Siège social',
            lieuArrive: 'Zone industrielle',
            heureDepart: '07:00',
            tarif: 3000,
            nombreSalariesMin: 10,
            actif: true,
          },
          {
            clientId: client.id,
            typeService: 'TRAJET_JOURNALIER',
            nomService: 'Navette soir - Retour',
            description: 'Retour vers le siège social',
            lieuDepart: 'Zone industrielle',
            lieuArrive: 'Siège social',
            heureDepart: '17:30',
            tarif: 3000,
            nombreSalariesMin: 10,
            actif: true,
          },
          {
            clientId: client.id,
            typeService: 'SERVICE_EXCEPTIONNEL',
            nomService: 'Transport événement VIP',
            description: 'Service ponctuel pour événements spéciaux',
            lieuDepart: 'Aéroport',
            lieuArrive: 'Hôtel',
            tarif: 1500,
            nombreSalariesMin: 1,
            actif: true,
          },
        ],
      });
    }
  }
  console.log('✅ Services créés\n');

  // 13. Factures
  console.log('📊 Création des factures...');
  const factures = [];
  const statuts = ['EN_ATTENTE', 'EN_RETARD', 'PAYEE', 'EN_ATTENTE'] as const;
  
  for (let i = 0; i < clients.length - 1; i++) {
    const client = clients[i];
    const mois = now.getMonth() - i;
    const annee = now.getFullYear();
    const numero = `FAC-${annee}-${String(100 + i).padStart(3, '0')}`;
    
    const existingFacture = await prisma.facture.findUnique({
      where: { numero }
    });

    if (!existingFacture) {
      const montantHT = 5000 + Math.random() * 5000;
      const dateEmission = new Date(annee, mois < 0 ? mois + 12 : mois, 1);
      const dateEcheance = new Date(annee, mois < 0 ? mois + 12 : mois, 30);

      const facture = await prisma.facture.create({
        data: {
          numero,
          clientId: client.id,
          dateEmission,
          dateEcheance,
          montantHT,
          tauxTVA: 20,
          montantTVA: montantHT * 0.2,
          montantTTC: montantHT * 1.2,
          statut: statuts[i],
        },
      });
      factures.push(facture);
    } else {
      factures.push(existingFacture);
    }
  }
  console.log(`✅ ${factures.length} factures créées\n`);

  // 14. Paiements
  console.log('💳 Création des paiements...');
  for (const facture of factures.filter(f => f.statut === 'PAYEE')) {
    const existingPaiement = await prisma.paiement.findFirst({
      where: { factureId: facture.id }
    });

    if (!existingPaiement) {
      await prisma.paiement.create({
        data: {
          factureId: facture.id,
          clientId: facture.clientId,
          montant: facture.montantTTC,
          mode: 'VIREMENT',
          reference: `VIR-${facture.numero}`,
          date: facture.dateEcheance,
        },
      });
    }
  }
  console.log('✅ Paiements créés\n');

  // 15. Alertes
  console.log('🔔 Création des alertes...');
  const alertes = [
    {
      type: 'DOCUMENT_EXPIRE' as const,
      titre: 'Document à renouveler',
      message: 'Le permis de conduire de Mohammed Alami expire dans 30 jours',
      priority: 'MOYENNE' as const,
      lu: false,
      resolute: false,
      referenceId: chauffeurs[0].id,
    },
    {
      type: 'FACTURE_IMPAYEE' as const,
      titre: 'Facture en retard',
      message: 'La facture FAC-2024-101 est en retard de paiement',
      priority: 'HAUTE' as const,
      lu: false,
      resolute: false,
      referenceId: factures[1]?.id || '',
    },
    {
      type: 'ENTRETIEN_A_VENIR' as const,
      titre: 'Entretien programmé',
      message: 'Vidange prévue pour le véhicule 12345-A-1 dans 15 jours',
      priority: 'BASSE' as const,
      lu: false,
      resolute: false,
      referenceId: vehicules[0].id,
    },
    {
      type: 'VISITE_TECHNIQUE_PROCHE' as const,
      titre: 'Visite technique proche',
      message: 'La visite technique du véhicule 34567-C-3 expire dans 30 jours',
      priority: 'MOYENNE' as const,
      lu: true,
      resolute: false,
      referenceId: vehicules[2].id,
    },
  ];

  for (const alerte of alertes) {
    const existing = await prisma.alerte.findFirst({
      where: { titre: alerte.titre, referenceId: alerte.referenceId }
    });
    
    if (!existing) {
      await prisma.alerte.create({ data: alerte });
    }
  }
  console.log('✅ Alertes créées\n');

  // 16. Salaires du mois en cours
  console.log('💵 Création des salaires...');
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const chauffeur of chauffeurs.filter(c => c.actif)) {
    const existingSalaire = await prisma.salaire.findFirst({
      where: {
        chauffeurId: chauffeur.id,
        mois: currentMonth + 1,
        annee: currentYear,
      },
    });

    if (!existingSalaire) {
      let montantBase = chauffeur.montantSalaire;
      if (chauffeur.typeSalaire === 'HORAIRE') {
        montantBase = chauffeur.montantSalaire * 176;
      } else if (chauffeur.typeSalaire === 'PAR_TOURNEE') {
        montantBase = chauffeur.montantSalaire * 22;
      }

      await prisma.salaire.create({
        data: {
          chauffeurId: chauffeur.id,
          mois: currentMonth + 1,
          annee: currentYear,
          heuresTravaillees: chauffeur.typeSalaire === 'HORAIRE' ? 176 : null,
          joursTravailles: chauffeur.typeSalaire === 'PAR_TOURNEE' ? 22 : null,
          montantBase,
          montantPrimes: 0,
          montantAvances: 0,
          montantNet: montantBase,
          paye: false,
        },
      });
    }
  }
  console.log('✅ Salaires créés\n');

  // 17. Utilisateur admin par défaut
  console.log('👤 Création de l\'utilisateur admin...');
  const existingAdmin = await prisma.utilisateur.findUnique({
    where: { email: 'admin@mgktransport.ma' }
  });

  if (!existingAdmin) {
    await prisma.utilisateur.create({
      data: {
        email: 'admin@mgktransport.ma',
        motDePasse: 'admin123',
        nom: 'Admin',
        prenom: 'MGK',
        role: 'ADMIN',
        actif: true,
      },
    });
    console.log('✅ Utilisateur admin créé (email: admin@mgktransport.ma, mot de passe: admin123)\n');
  } else {
    console.log('ℹ️  Utilisateur admin existe déjà\n');
  }

  // Créer un utilisateur comptable
  const existingComptable = await prisma.utilisateur.findUnique({
    where: { email: 'comptable@mgktransport.ma' }
  });

  if (!existingComptable) {
    await prisma.utilisateur.create({
      data: {
        email: 'comptable@mgktransport.ma',
        motDePasse: 'compta123',
        nom: 'Comptable',
        prenom: 'MGK',
        role: 'COMPTABLE',
        actif: true,
      },
    });
    console.log('✅ Utilisateur comptable créé (email: comptable@mgktransport.ma, mot de passe: compta123)\n');
  }

  // Créer un utilisateur exploitation
  const existingExploitation = await prisma.utilisateur.findUnique({
    where: { email: 'exploitation@mgktransport.ma' }
  });

  if (!existingExploitation) {
    await prisma.utilisateur.create({
      data: {
        email: 'exploitation@mgktransport.ma',
        motDePasse: 'exploit123',
        nom: 'Exploitation',
        prenom: 'MGK',
        role: 'EXPLOITATION',
        actif: true,
      },
    });
    console.log('✅ Utilisateur exploitation créé (email: exploitation@mgktransport.ma, mot de passe: exploit123)\n');
  }

  console.log('🎉 Initialisation terminée avec succès !\n');
  console.log('📋 Résumé:');
  console.log(`   - ${chauffeurs.length} chauffeurs (4 actifs, 1 inactif)`);
  console.log(`   - ${vehicules.length} véhicules (4 actifs, 1 inactif)`);
  console.log(`   - ${clients.length} clients (4 actifs, 1 inactif)`);
  console.log(`   - ${factures.length} factures`);
  console.log('   - Documents, entretiens, carburant, primes, avances...');
  console.log('   - Utilisateurs: admin@mgktransport.ma / admin123');
  console.log('\n✅ L\'application est prête à être utilisée !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de l\'initialisation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
