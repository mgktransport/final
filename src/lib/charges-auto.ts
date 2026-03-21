// Fonctions utilitaires pour créer les charges automatiques
import { db } from '@/lib/db'
import { TypeCharge, SourceCharge } from '@prisma/client'

/**
 * Crée les charges automatiques lors du paiement d'un salaire
 * - Charge SALAIRES pour le net à payer
 * - Charge CHARGES_SOCIALES pour CNSS + Assurance
 */
export async function creerChargesSalaire(params: {
  salaireId: string
  chauffeurId: string
  chauffeurNom: string
  mois: number
  annee: number
  montantNet: number
  montantCNSS: number
  montantAssurance: number
  datePaiement: Date
}) {
  const { 
    salaireId, 
    chauffeurId, 
    chauffeurNom, 
    mois, 
    annee, 
    montantNet, 
    montantCNSS, 
    montantAssurance,
    datePaiement 
  } = params

  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const charges = []

  // 1. Créer la charge SALAIRES (net à payer)
  if (montantNet > 0) {
    const chargeSalaire = await db.charge.create({
      data: {
        type: TypeCharge.SOCIETE,
        categorie: 'SALAIRES',
        description: `Salaire ${moisNoms[mois - 1]} ${annee} - ${chauffeurNom}`,
        montant: montantNet,
        dateCharge: datePaiement,
        automatique: true,
        sourceType: SourceCharge.SALAIRE,
        sourceId: salaireId,
        chauffeurId,
      }
    })
    charges.push(chargeSalaire)
  }

  // 2. Créer la charge CHARGES_SOCIALES (CNSS + Assurance)
  const totalChargesSociales = montantCNSS + montantAssurance
  if (totalChargesSociales > 0) {
    const chargeSociale = await db.charge.create({
      data: {
        type: TypeCharge.SOCIETE,
        categorie: 'CHARGES_SOCIALES',
        description: `Charges sociales ${moisNoms[mois - 1]} ${annee} - ${chauffeurNom} (CNSS: ${montantCNSS.toFixed(2)}, Assurance: ${montantAssurance.toFixed(2)})`,
        montant: totalChargesSociales,
        dateCharge: datePaiement,
        automatique: true,
        sourceType: SourceCharge.SALAIRE,
        sourceId: salaireId,
        chauffeurId,
      }
    })
    charges.push(chargeSociale)
  }

  return charges
}

/**
 * Met à jour les charges automatiques d'un salaire (si modification)
 */
export async function mettreAJourChargesSalaire(params: {
  salaireId: string
  chauffeurId: string
  chauffeurNom: string
  mois: number
  annee: number
  montantNet: number
  montantCNSS: number
  montantAssurance: number
  datePaiement: Date
}) {
  const { salaireId, ...rest } = params

  // Supprimer les anciennes charges
  await db.charge.deleteMany({
    where: {
      sourceType: SourceCharge.SALAIRE,
      sourceId: salaireId,
    }
  })

  // Créer les nouvelles charges
  return creerChargesSalaire({ salaireId, ...rest })
}

/**
 * Crée la charge automatique lors de l'ajout d'un plein de carburant
 */
export async function creerChargeCarburant(params: {
  pleinId: string
  vehiculeId: string
  vehiculeImmat: string
  montant: number
  quantite: number
  date: Date
}) {
  const { pleinId, vehiculeId, vehiculeImmat, montant, quantite, date } = params

  const charge = await db.charge.create({
    data: {
      type: TypeCharge.VEHICULE,
      categorie: 'CARBURANT',
      description: `Carburant ${vehiculeImmat} - ${quantite.toFixed(0)}L`,
      montant,
      dateCharge: date,
      vehiculeId,
      automatique: true,
      sourceType: SourceCharge.PLEIN_CARBURANT,
      sourceId: pleinId,
    }
  })

  return charge
}

/**
 * Met à jour la charge automatique d'un plein de carburant
 */
export async function mettreAJourChargeCarburant(params: {
  pleinId: string
  vehiculeId: string
  vehiculeImmat: string
  montant: number
  quantite: number
  date: Date
}) {
  const { pleinId, ...rest } = params

  // Mettre à jour la charge existante
  const existingCharge = await db.charge.findFirst({
    where: {
      sourceType: SourceCharge.PLEIN_CARBURANT,
      sourceId: pleinId,
    }
  })

  if (existingCharge) {
    return db.charge.update({
      where: { id: existingCharge.id },
      data: {
        description: `Carburant ${rest.vehiculeImmat} - ${rest.quantite.toFixed(0)}L`,
        montant: rest.montant,
        dateCharge: rest.date,
        vehiculeId: rest.vehiculeId,
      }
    })
  } else {
    // Créer si n'existe pas
    return creerChargeCarburant({ pleinId, ...rest })
  }
}

/**
 * Supprime la charge automatique d'un plein de carburant
 */
export async function supprimerChargeCarburant(pleinId: string) {
  await db.charge.deleteMany({
    where: {
      sourceType: SourceCharge.PLEIN_CARBURANT,
      sourceId: pleinId,
    }
  })
}

/**
 * Crée la charge automatique lors de l'ajout d'un entretien
 */
export async function creerChargeEntretien(params: {
  entretienId: string
  vehiculeId: string
  vehiculeImmat: string
  typeEntretien: string
  montant: number
  date: Date
}) {
  const { entretienId, vehiculeId, vehiculeImmat, typeEntretien, montant, date } = params

  const charge = await db.charge.create({
    data: {
      type: TypeCharge.VEHICULE,
      categorie: 'ENTRETIEN_VEHICULE',
      description: `Entretien ${typeEntretien} - ${vehiculeImmat}`,
      montant,
      dateCharge: date,
      vehiculeId,
      automatique: true,
      sourceType: SourceCharge.ENTRETIEN,
      sourceId: entretienId,
    }
  })

  return charge
}

/**
 * Met à jour la charge automatique d'un entretien
 */
export async function mettreAJourChargeEntretien(params: {
  entretienId: string
  vehiculeId: string
  vehiculeImmat: string
  typeEntretien: string
  montant: number
  date: Date
}) {
  const { entretienId, ...rest } = params

  const existingCharge = await db.charge.findFirst({
    where: {
      sourceType: SourceCharge.ENTRETIEN,
      sourceId: entretienId,
    }
  })

  if (existingCharge) {
    return db.charge.update({
      where: { id: existingCharge.id },
      data: {
        description: `Entretien ${rest.typeEntretien} - ${rest.vehiculeImmat}`,
        montant: rest.montant,
        dateCharge: rest.date,
        vehiculeId: rest.vehiculeId,
      }
    })
  } else {
    return creerChargeEntretien({ entretienId, ...rest })
  }
}

/**
 * Supprime la charge automatique d'un entretien
 */
export async function supprimerChargeEntretien(entretienId: string) {
  await db.charge.deleteMany({
    where: {
      sourceType: SourceCharge.ENTRETIEN,
      sourceId: entretienId,
    }
  })
}
