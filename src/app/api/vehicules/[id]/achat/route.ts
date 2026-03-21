import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicules/[id]/achat - Récupérer les informations d'achat d'un véhicule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Use Prisma ORM instead of raw queries
    const achat = await db.achatVehicule.findUnique({
      where: { vehiculeId: id },
      include: {
        echeances: {
          orderBy: { numeroEcheance: 'asc' }
        },
        paiementsAchat: {
          orderBy: { datePaiement: 'desc' }
        }
      }
    })

    if (!achat) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Aucun achat enregistré pour ce véhicule'
      })
    }

    // Calculate stats
    const echeancesPayees = achat.echeances.filter(e => e.statut === 'PAYEE').length
    const echeancesEnRetard = achat.echeances.filter(e => e.statut === 'EN_RETARD').length
    const prochaineEcheance = achat.echeances.find(e => e.statut === 'EN_ATTENTE' || e.statut === 'EN_RETARD')

    const achatWithStats = {
      ...achat,
      stats: {
        echeancesPayees,
        echeancesEnRetard,
        totalEcheances: achat.nombreEcheances || 0,
        prochaineEcheance,
        pourcentagePaye: achat.montantTotal > 0 ? (achat.montantPaye / achat.montantTotal) * 100 : 0
      }
    }

    return NextResponse.json({ success: true, data: achatWithStats })
  } catch (error) {
    console.error('Erreur récupération achat:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des informations d\'achat' },
      { status: 500 }
    )
  }
}

// POST /api/vehicules/[id]/achat - Créer un nouvel achat pour un véhicule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id }
    })

    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier qu'il n'y a pas déjà un achat pour ce véhicule
    const existingAchat = await db.achatVehicule.findUnique({
      where: { vehiculeId: id }
    })

    if (existingAchat) {
      return NextResponse.json(
        { success: false, error: 'Un achat existe déjà pour ce véhicule' },
        { status: 400 }
      )
    }

    const {
      typeAchat,
      dateAchat,
      montantTotal,
      acompte,
      fournisseur,
      adresseFournisseur,
      telephoneFournisseur,
      numeroFacture,
      observations,
      nombreEcheances,
      montantEcheance,
      datePremiereEcheance,
      frequencePaiement
    } = body

    // Calculer les montants
    const acompteValue = parseFloat(acompte) || 0
    const montantTotalValue = parseFloat(montantTotal)
    const montantRestant = typeAchat === 'CREDIT'
      ? montantTotalValue - acompteValue
      : 0

    const dateAchatObj = new Date(dateAchat)

    // Préparer les données de l'achat
    const achatData: any = {
      vehiculeId: id,
      typeAchat,
      dateAchat: dateAchatObj,
      montantTotal: montantTotalValue,
      acompte: acompteValue,
      fournisseur: fournisseur || null,
      adresseFournisseur: adresseFournisseur || null,
      telephoneFournisseur: telephoneFournisseur || null,
      numeroFacture: numeroFacture || null,
      observations: observations || null,
      statut: typeAchat === 'COMPTANT' ? 'SOLDE' : 'EN_COURS',
      montantPaye: typeAchat === 'COMPTANT' ? montantTotalValue : acompteValue,
      montantRestant,
      dateDernierPaiement: typeAchat === 'COMPTANT' ? dateAchatObj : (acompteValue > 0 ? dateAchatObj : null),
    }

    // Ajouter les champs spécifiques au crédit
    if (typeAchat === 'CREDIT') {
      achatData.nombreEcheances = parseInt(nombreEcheances)
      achatData.montantEcheance = parseFloat(montantEcheance)
      achatData.datePremiereEcheance = datePremiereEcheance ? new Date(datePremiereEcheance) : null
      achatData.frequencePaiement = frequencePaiement
    }

    // Créer les échéances si crédit
    const echeancesData: any[] = []
    if (typeAchat === 'CREDIT') {
      const nbEcheances = parseInt(nombreEcheances)
      const montantParEcheance = parseFloat(montantEcheance)
      const premiereDate = new Date(datePremiereEcheance)

      for (let i = 0; i < nbEcheances; i++) {
        const dateEcheance = new Date(premiereDate)

        switch (frequencePaiement) {
          case 'MENSUEL':
            dateEcheance.setMonth(dateEcheance.getMonth() + i)
            break
          case 'TRIMESTRIEL':
            dateEcheance.setMonth(dateEcheance.getMonth() + (i * 3))
            break
          case 'SEMESTRIEL':
            dateEcheance.setMonth(dateEcheance.getMonth() + (i * 6))
            break
          case 'ANNUEL':
            dateEcheance.setFullYear(dateEcheance.getFullYear() + i)
            break
        }

        echeancesData.push({
          numeroEcheance: i + 1,
          dateEcheance,
          montantEcheance: montantParEcheance,
          montantPaye: 0,
          statut: 'EN_ATTENTE'
        })
      }
    }

    // Créer l'achat avec Prisma
    const achat = await db.achatVehicule.create({
      data: {
        ...achatData,
        echeances: echeancesData.length > 0 ? { create: echeancesData } : undefined
      },
      include: {
        echeances: true,
        paiementsAchat: true
      }
    })

    // Créer le paiement initial et la charge si nécessaire
    if (typeAchat === 'COMPTANT') {
      // Créer le paiement
      await db.paiementAchat.create({
        data: {
          achatVehiculeId: achat.id,
          datePaiement: dateAchatObj,
          montant: montantTotalValue,
          modePaiement: 'ESPECES',
          observations: 'Paiement comptant intégral'
        }
      })

      // Créer la charge
      await db.charge.create({
        data: {
          type: 'VEHICULE',
          categorie: 'ACHAT_VEHICULE',
          description: `Achat véhicule - ${fournisseur || 'Comptant'}`,
          montant: montantTotalValue,
          dateCharge: dateAchatObj,
          vehiculeId: id,
          automatique: true,
          sourceType: 'ACHAT_VEHICULE'
        }
      })
    } else if (typeAchat === 'CREDIT' && acompteValue > 0) {
      // Créer le paiement acompte
      await db.paiementAchat.create({
        data: {
          achatVehiculeId: achat.id,
          datePaiement: dateAchatObj,
          montant: acompteValue,
          modePaiement: 'ESPECES',
          observations: 'Acompte initial'
        }
      })

      // Créer la charge pour l'acompte
      await db.charge.create({
        data: {
          type: 'VEHICULE',
          categorie: 'ACHAT_VEHICULE',
          description: `Achat véhicule (Acompte) - ${fournisseur || 'Crédit'}`,
          montant: acompteValue,
          dateCharge: dateAchatObj,
          vehiculeId: id,
          automatique: true,
          sourceType: 'ACHAT_VEHICULE'
        }
      })
    }

    // Récupérer l'achat complet
    const newAchat = await db.achatVehicule.findUnique({
      where: { id: achat.id },
      include: {
        echeances: { orderBy: { numeroEcheance: 'asc' } },
        paiementsAchat: { orderBy: { datePaiement: 'desc' } }
      }
    })

    return NextResponse.json({
      success: true,
      data: newAchat,
      message: 'Achat enregistré avec succès'
    })
  } catch (error) {
    console.error('Erreur création achat:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement de l\'achat: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

// PUT /api/vehicules/[id]/achat - Mettre à jour un achat
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const achat = await db.achatVehicule.findUnique({
      where: { vehiculeId: id }
    })

    if (!achat) {
      return NextResponse.json(
        { success: false, error: 'Achat non trouvé' },
        { status: 404 }
      )
    }

    const {
      fournisseur,
      adresseFournisseur,
      telephoneFournisseur,
      numeroFacture,
      observations,
      statut
    } = body

    const updatedAchat = await db.achatVehicule.update({
      where: { id: achat.id },
      data: {
        fournisseur: fournisseur || null,
        adresseFournisseur: adresseFournisseur || null,
        telephoneFournisseur: telephoneFournisseur || null,
        numeroFacture: numeroFacture || null,
        observations: observations || null,
        statut
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedAchat,
      message: 'Achat mis à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur mise à jour achat:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'achat' },
      { status: 500 }
    )
  }
}

// DELETE /api/vehicules/[id]/achat - Supprimer un achat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const achat = await db.achatVehicule.findUnique({
      where: { vehiculeId: id }
    })

    if (!achat) {
      return NextResponse.json(
        { success: false, error: 'Achat non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer les charges associées à cet achat
    // Les charges ont sourceType = 'ACHAT_VEHICULE' ou 'ECHEANCE_CREDIT' liées au véhicule
    await db.charge.deleteMany({
      where: {
        vehiculeId: id,
        sourceType: { in: ['ACHAT_VEHICULE', 'ECHEANCE_CREDIT'] }
      }
    })

    // Supprimer d'abord les échéances et paiements (via cascade ou manuellement)
    await db.echeanceCredit.deleteMany({
      where: { achatVehiculeId: achat.id }
    })

    await db.paiementAchat.deleteMany({
      where: { achatVehiculeId: achat.id }
    })

    // Supprimer l'achat
    await db.achatVehicule.delete({
      where: { id: achat.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Achat et charges associées supprimés avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression achat:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'achat' },
      { status: 500 }
    )
  }
}
