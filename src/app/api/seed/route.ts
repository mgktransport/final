import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/seed - Populate database with test data
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting database seeding...');

    const results = {
      parametres: 0,
      typesEntretien: 0,
      typesDocuments: 0,
      categoriesCharges: 0,
      chauffeurs: 0,
      documentsChauffeur: 0,
      primes: 0,
      avances: 0,
      vehicules: 0,
      documentsVehicule: 0,
      entretiens: 0,
      pleinsCarburant: 0,
      clients: 0,
      services: 0,
      exploitations: 0,
      factures: 0,
      paiements: 0,
      salaires: 0,
      utilisateurs: 0,
      alertes: 0,
    };

    const now = new Date();
    const futureDate = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const pastDate = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Paramètres entreprise
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
    ];

    for (const param of parametres) {
      await db.parametre.upsert({
        where: { cle: param.cle },
        update: { valeur: param.valeur },
        create: param,
      });
      results.parametres++;
    }
    console.log(`✅ ${results.parametres} paramètres créés`);

    // 2. Types d'entretien
    const typesEntretienData = [
      { code: 'COURROIE', nom: 'Courroie de distribution', description: 'Remplacement courroie' },
      { code: 'BATTERIE', nom: 'Batterie', description: 'Remplacement batterie' },
      { code: 'CLIMATISATION', nom: 'Climatisation', description: 'Entretien climatisation' },
    ];

    for (const type of typesEntretienData) {
      await db.typeEntretienPersonnalise.upsert({
        where: { code: type.code },
        update: type,
        create: type,
      });
      results.typesEntretien++;
    }
    console.log(`✅ ${results.typesEntretien} types d'entretien créés`);

    // 3. Types de documents
    const typesDocsData = [
      { code: 'ATTESTATION_FORMATION', nom: 'Attestation de formation', description: 'Formation chauffeur', categorie: 'CHAUFFEUR' },
      { code: 'LICENCE_TRANSPORT', nom: 'Licence de transport', description: 'Licence transport personnes', categorie: 'VEHICULE' },
    ];

    for (const type of typesDocsData) {
      await db.typeDocumentPersonnalise.upsert({
        where: { code: type.code },
        update: type,
        create: type,
      });
      results.typesDocuments++;
    }
    console.log(`✅ ${results.typesDocuments} types de documents créés`);

    // 4. Catégories de charges
    const categoriesData = [
      { code: 'LAVAGE', nom: 'Lavage', type: 'VEHICULE' as const, description: 'Lavage véhicule' },
      { code: 'PARKING', nom: 'Parking', type: 'VEHICULE' as const, description: 'Stationnement' },
      { code: 'PEAGE', nom: 'Péage', type: 'VEHICULE' as const, description: 'Péage autoroutier' },
      { code: 'FOURNITURES', nom: 'Fournitures', type: 'SOCIETE' as const, description: 'Fournitures bureau' },
      { code: 'LOYER', nom: 'Loyer', type: 'SOCIETE' as const, description: 'Loyer locaux' },
    ];

    for (const cat of categoriesData) {
      await db.categorieChargePersonnalise.upsert({
        where: { code: cat.code },
        update: cat,
        create: cat,
      });
      results.categoriesCharges++;
    }
    console.log(`✅ ${results.categoriesCharges} catégories de charges créées`);

    // 5. Chauffeurs
    const chauffeursData = [
      { nom: 'Alami', prenom: 'Mohammed', cin: 'AB123456', telephone: '+212 661 123 456', adresse: 'Casablanca', dateEmbauche: new Date('2020-01-15'), typeContrat: 'CDI' as const, typeSalaire: 'FIXE' as const, montantSalaire: 5000, montantCNSS: 200, montantAssurance: 150, actif: true },
      { nom: 'Benali', prenom: 'Ahmed', cin: 'CD789012', telephone: '+212 662 234 567', adresse: 'Rabat', dateEmbauche: new Date('2021-03-01'), typeContrat: 'CDI' as const, typeSalaire: 'HORAIRE' as const, montantSalaire: 35, montantCNSS: 200, montantAssurance: 150, actif: true },
      { nom: 'Chraibi', prenom: 'Karim', cin: 'EF345678', telephone: '+212 663 345 678', adresse: 'Fès', dateEmbauche: new Date('2022-06-15'), typeContrat: 'CDD' as const, typeSalaire: 'PAR_TOURNEE' as const, montantSalaire: 150, montantCNSS: 200, montantAssurance: 150, actif: true },
      { nom: 'Dahbi', prenom: 'Youssef', cin: 'GH901234', telephone: '+212 664 456 789', adresse: 'Marrakech', dateEmbauche: new Date('2023-01-10'), typeContrat: 'JOURNALIER' as const, typeSalaire: 'HORAIRE' as const, montantSalaire: 40, montantCNSS: 0, montantAssurance: 100, actif: true },
    ];

    const chauffeurs = [];
    for (const c of chauffeursData) {
      const chauffeur = await db.chauffeur.upsert({
        where: { cin: c.cin },
        update: {},
        create: c,
      });
      chauffeurs.push(chauffeur);
      results.chauffeurs++;
    }
    console.log(`✅ ${results.chauffeurs} chauffeurs créés`);

    // 6. Documents chauffeurs
    for (const chauffeur of chauffeurs) {
      const existing = await db.documentChauffeur.count({ where: { chauffeurId: chauffeur.id } });
      if (existing === 0) {
        await db.documentChauffeur.createMany({
          data: [
            { chauffeurId: chauffeur.id, type: 'PERMIS_CONDUIRE', numero: `PERMIS-${chauffeur.cin}`, dateExpiration: futureDate(365) },
            { chauffeurId: chauffeur.id, type: 'VISITE_MEDICALE', numero: `VM-${chauffeur.cin}`, dateExpiration: futureDate(180) },
          ],
        });
        results.documentsChauffeur += 2;
      }
    }
    console.log(`✅ ${results.documentsChauffeur} documents chauffeurs créés`);

    // 7. Primes et avances
    for (const chauffeur of chauffeurs.slice(0, 3)) {
      const existingPrimes = await db.prime.count({ where: { chauffeurId: chauffeur.id } });
      if (existingPrimes === 0) {
        await db.prime.createMany({
          data: [
            { chauffeurId: chauffeur.id, motif: "Prime d'assiduité", montant: 500, date: pastDate(15), comptabilise: false },
            { chauffeurId: chauffeur.id, motif: 'Prime de performance', montant: 800, date: pastDate(45), comptabilise: true },
          ],
        });
        results.primes += 2;
      }
      const existingAvances = await db.avance.count({ where: { chauffeurId: chauffeur.id } });
      if (existingAvances === 0) {
        await db.avance.createMany({
          data: [
            { chauffeurId: chauffeur.id, montant: 1000, date: pastDate(20), rembourse: false },
            { chauffeurId: chauffeur.id, montant: 500, date: pastDate(60), rembourse: true },
          ],
        });
        results.avances += 2;
      }
    }
    console.log(`✅ ${results.primes} primes et ${results.avances} avances créées`);

    // 8. Véhicules
    const vehiculesData = [
      { immatriculation: '12345-A-1', marque: 'Mercedes', modele: 'Sprinter 515', annee: 2020, typeCarburant: 'DIESEL' as const, capacite: 18, kilometrage: 125000, actif: true, chauffeurId: chauffeurs[0].id },
      { immatriculation: '23456-B-2', marque: 'Iveco', modele: 'Daily 35C15', annee: 2021, typeCarburant: 'DIESEL' as const, capacite: 22, kilometrage: 85000, actif: true, chauffeurId: chauffeurs[1].id },
      { immatriculation: '34567-C-3', marque: 'Renault', modele: 'Master L3H2', annee: 2019, typeCarburant: 'DIESEL' as const, capacite: 15, kilometrage: 180000, actif: true, chauffeurId: chauffeurs[2].id },
      { immatriculation: '45678-D-4', marque: 'Ford', modele: 'Transit Custom', annee: 2022, typeCarburant: 'DIESEL' as const, capacite: 9, kilometrage: 45000, actif: true, chauffeurId: chauffeurs[3].id },
    ];

    const vehicules = [];
    for (const v of vehiculesData) {
      const vehicule = await db.vehicule.upsert({
        where: { immatriculation: v.immatriculation },
        update: {},
        create: v,
      });
      vehicules.push(vehicule);
      results.vehicules++;
    }
    console.log(`✅ ${results.vehicules} véhicules créés`);

    // 9. Documents véhicules
    for (const vehicule of vehicules) {
      const existing = await db.documentVehicule.count({ where: { vehiculeId: vehicule.id } });
      if (existing === 0) {
        await db.documentVehicule.createMany({
          data: [
            { vehiculeId: vehicule.id, type: 'ASSURANCE', numero: `ASS-${vehicule.immatriculation}`, dateExpiration: futureDate(180) },
            { vehiculeId: vehicule.id, type: 'VISITE_TECHNIQUE', numero: `VT-${vehicule.immatriculation}`, dateExpiration: futureDate(90) },
          ],
        });
        results.documentsVehicule += 2;
      }
    }
    console.log(`✅ ${results.documentsVehicule} documents véhicules créés`);

    // 10. Entretiens
    for (const vehicule of vehicules) {
      const existing = await db.entretien.count({ where: { vehiculeId: vehicule.id } });
      if (existing === 0) {
        await db.entretien.createMany({
          data: [
            { vehiculeId: vehicule.id, type: 'VIDANGE', description: 'Vidange huile moteur', cout: 800, kilometrage: vehicule.kilometrage - 10000, dateIntervention: pastDate(30), prochainKm: vehicule.kilometrage + 5000 },
            { vehiculeId: vehicule.id, type: 'PNEUS', description: 'Remplacement pneus', cout: 1500, kilometrage: vehicule.kilometrage - 25000, dateIntervention: pastDate(90) },
          ],
        });
        results.entretiens += 2;
      }
    }
    console.log(`✅ ${results.entretiens} entretiens créés`);

    // 11. Pleins carburant
    const stations = ['Afriquia', 'Shell', 'Total', 'Winxo'];
    for (const vehicule of vehicules) {
      for (let i = 0; i < 3; i++) {
        const quantite = 50 + Math.random() * 30;
        const prixUnitaire = 10.5;
        await db.pleinCarburant.create({
          data: {
            vehiculeId: vehicule.id,
            quantite,
            prixUnitaire,
            prixTotal: quantite * prixUnitaire,
            station: stations[i % 4],
            kilometrage: vehicule.kilometrage - i * 1000,
            date: pastDate(i * 7),
          },
        });
        results.pleinsCarburant++;
      }
    }
    console.log(`✅ ${results.pleinsCarburant} pleins carburant créés`);

    // 12. Clients
    const clientsData = [
      { nomEntreprise: 'Atlas Industries', contact: 'M. Rachid Tazi', telephone: '+212 535 123 456', email: 'contact@atlasindustries.ma', adresse: 'Zone industrielle, Casablanca', typeContrat: 'MENSUEL' as const, actif: true },
      { nomEntreprise: 'Maroc Pharma', contact: 'Mme. Fatima Zahra', telephone: '+212 537 234 567', email: 'logistique@marocpharma.ma', adresse: 'Route de Rabat, Salé', typeContrat: 'ANNUEL' as const, actif: true },
      { nomEntreprise: 'Tanger Logistique', contact: 'M. Ahmed Bennani', telephone: '+212 539 345 678', email: 'transport@tangerlog.ma', adresse: 'Port Tanger Med', typeContrat: 'MENSUEL' as const, actif: true },
      { nomEntreprise: 'Sud Express', contact: 'M. Khalid Amrani', telephone: '+212 524 456 789', email: 'info@sudexpress.ma', adresse: 'Marrakech', typeContrat: 'PONCTUEL' as const, actif: true },
    ];

    const clients = [];
    for (const c of clientsData) {
      const existing = await db.client.findFirst({ where: { nomEntreprise: c.nomEntreprise } });
      const client = existing || await db.client.create({ data: c });
      clients.push(client);
      if (!existing) results.clients++;
    }
    console.log(`✅ ${results.clients} clients créés`);

    // 13. Services
    for (const client of clients) {
      const existing = await db.service.count({ where: { clientId: client.id } });
      if (existing === 0) {
        await db.service.createMany({
          data: [
            { clientId: client.id, typeService: 'TRAJET_JOURNALIER' as const, nomService: 'Navette matin', lieuDepart: 'Siège', lieuArrive: 'Usine', heureDepart: '07:00', tarif: 3000, nombreSalariesMin: 10, actif: true },
            { clientId: client.id, typeService: 'TRAJET_JOURNALIER' as const, nomService: 'Navette soir', lieuDepart: 'Usine', lieuArrive: 'Siège', heureDepart: '17:30', tarif: 3000, nombreSalariesMin: 10, actif: true },
          ],
        });
        results.services += 2;
      }
    }
    console.log(`✅ ${results.services} services créés`);

    // 14. Factures
    const statuts = ['EN_ATTENTE', 'EN_RETARD', 'PAYEE', 'EN_ATTENTE'] as const;
    const factures = [];
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const numero = `FAC-2024-${String(100 + i).padStart(3, '0')}`;
      const existing = await db.facture.findUnique({ where: { numero } });
      
      if (!existing) {
        const montantHT = 5000 + i * 1000;
        const facture = await db.facture.create({
          data: {
            numero,
            clientId: client.id,
            dateEmission: pastDate(i * 30),
            dateEcheance: pastDate(i * 30 - 30 + 30),
            montantHT,
            tauxTVA: 20,
            montantTVA: montantHT * 0.2,
            montantTTC: montantHT * 1.2,
            statut: statuts[i],
          },
        });
        factures.push(facture);
        results.factures++;
      } else {
        factures.push(existing);
      }
    }
    console.log(`✅ ${results.factures} factures créées`);

    // 15. Paiements
    for (const facture of factures.filter(f => f.statut === 'PAYEE')) {
      const existing = await db.paiement.count({ where: { factureId: facture.id } });
      if (existing === 0) {
        await db.paiement.create({
          data: {
            factureId: facture.id,
            clientId: facture.clientId,
            montant: facture.montantTTC,
            mode: 'VIREMENT',
            reference: `VIR-${facture.numero}`,
            date: facture.dateEcheance,
          },
        });
        results.paiements++;
      }
    }
    console.log(`✅ ${results.paiements} paiements créés`);

    // 16. Salaires
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    for (const chauffeur of chauffeurs) {
      const existing = await db.salaire.count({
        where: { chauffeurId: chauffeur.id, mois: currentMonth, annee: currentYear },
      });
      if (existing === 0) {
        let montantBase = chauffeur.montantSalaire;
        if (chauffeur.typeSalaire === 'HORAIRE') montantBase *= 176;
        if (chauffeur.typeSalaire === 'PAR_TOURNEE') montantBase *= 22;

        await db.salaire.create({
          data: {
            chauffeurId: chauffeur.id,
            mois: currentMonth,
            annee: currentYear,
            montantBase,
            montantPrimes: 0,
            montantAvances: 0,
            montantNet: montantBase,
            paye: false,
          },
        });
        results.salaires++;
      }
    }
    console.log(`✅ ${results.salaires} salaires créés`);

    // 17. Utilisateurs
    const utilisateursData = [
      { email: 'admin@mgktransport.ma', motDePasse: 'admin123', nom: 'Admin', prenom: 'MGK', role: 'ADMIN' as const, actif: true },
      { email: 'comptable@mgktransport.ma', motDePasse: 'compta123', nom: 'Comptable', prenom: 'MGK', role: 'COMPTABLE' as const, actif: true },
      { email: 'exploitation@mgktransport.ma', motDePasse: 'exploit123', nom: 'Exploitation', prenom: 'MGK', role: 'EXPLOITATION' as const, actif: true },
    ];

    for (const u of utilisateursData) {
      const existing = await db.utilisateur.findUnique({ where: { email: u.email } });
      if (!existing) {
        await db.utilisateur.create({ data: u });
        results.utilisateurs++;
      }
    }
    console.log(`✅ ${results.utilisateurs} utilisateurs créés`);

    console.log('🎉 Database seeding completed!');

    return NextResponse.json({
      success: true,
      message: 'Base de données alimentée avec succès!',
      results,
      credentials: {
        admin: { email: 'admin@mgktransport.ma', password: 'admin123' },
        comptable: { email: 'comptable@mgktransport.ma', password: 'compta123' },
        exploitation: { email: 'exploitation@mgktransport.ma', password: 'exploit123' },
      },
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}
