import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/achats-vehicules/[id]/paiements - Ajouter un paiement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get achat info using Prisma ORM
    const achat = await db.achatVehicule.findUnique({
      where: { id },
      include: {
        echeances: {
          orderBy: { numeroEcheance: 'asc' }
        }
      }
    })

    if (!achat) {
      return NextResponse.json(
        { success: false, error: 'Achat non trouvé' },
        { status: 404 }
      )
    }

    const {
      datePaiement,
      montant,
      modePaiement,
      reference,
      observations,
      echeanceId // Optionnel: ID de l'échéance payée
    } = body

    const montantValue = parseFloat(montant)
    const datePaiementObj = new Date(datePaiement)

    // Créer le paiement
    const paiement = await db.paiementAchat.create({
      data: {
        achatVehiculeId: id,
        datePaiement: datePaiementObj,
        montant: montantValue,
        modePaiement,
        reference: reference || null,
        observations: observations || null
      }
    })

    // Mettre à jour les montants de l'achat
    const nouveauMontantPaye = achat.montantPaye + montantValue
    const nouveauMontantRestant = Math.max(0, achat.montantTotal - nouveauMontantPaye)

    // Déterminer le nouveau statut
    let nouveauStatut = 'EN_COURS'
    if (nouveauMontantRestant <= 0) {
      nouveauStatut = 'SOLDE'
    }

    await db.achatVehicule.update({
      where: { id },
      data: {
        montantPaye: nouveauMontantPaye,
        montantRestant: nouveauMontantRestant,
        dateDernierPaiement: datePaiementObj,
        statut: nouveauStatut
      }
    })

    // Si une échéance est spécifiée, la marquer comme payée
    if (echeanceId) {
      await db.echeanceCredit.update({
        where: { id: echeanceId },
        data: {
          montantPaye: montantValue,
          datePaiement: datePaiementObj,
          statut: 'PAYEE'
        }
      })
    } else {
      // Sinon, marquer automatiquement les échéances comme payées
      let montantRestantPaiement = montantValue
      for (const echeance of achat.echeances) {
        if (montantRestantPaiement <= 0) break
        if (echeance.statut === 'PAYEE') continue

        const montantAPayer = Math.min(echeance.montantEcheance - echeance.montantPaye, montantRestantPaiement)

        const nouveauMontantPayeEcheance = echeance.montantPaye + montantAPayer
        const nouveauStatutEcheance = nouveauMontantPayeEcheance >= echeance.montantEcheance ? 'PAYEE' : 'PARTIELLEMENT'

        await db.echeanceCredit.update({
          where: { id: echeance.id },
          data: {
            montantPaye: nouveauMontantPayeEcheance,
            datePaiement: datePaiementObj,
            statut: nouveauStatutEcheance
          }
        })

        montantRestantPaiement -= montantAPayer
      }
    }

    // Vérifier et mettre à jour les échéances en retard
    const today = new Date()
    await db.echeanceCredit.updateMany({
      where: {
        achatVehiculeId: id,
        dateEcheance: { lt: today },
        statut: { in: ['EN_ATTENTE', 'PARTIELLEMENT'] }
      },
      data: { statut: 'EN_RETARD' }
    })

    // Récupérer le numéro de l'échéance pour la description
    let numeroEcheance = null
    if (echeanceId) {
      const echeanceData = await db.echeanceCredit.findUnique({
        where: { id: echeanceId },
        select: { numeroEcheance: true }
      })
      if (echeanceData) {
        numeroEcheance = echeanceData.numeroEcheance
      }
    }

    // Créer une charge automatique pour le paiement d'échéance
    const description = numeroEcheance
      ? `Achat véhicule (Échéance ${numeroEcheance}) - ${achat.fournisseur || 'Crédit'}`
      : `Achat véhicule (Paiement) - ${achat.fournisseur || 'Crédit'}`

    await db.charge.create({
      data: {
        type: 'VEHICULE',
        categorie: 'ACHAT_VEHICULE',
        description,
        montant: montantValue,
        dateCharge: datePaiementObj,
        vehiculeId: achat.vehiculeId,
        automatique: true,
        sourceType: 'ECHEANCE_CREDIT',
        sourceId: paiement.id
      }
    })

    return NextResponse.json({
      success: true,
      data: { id: paiement.id, datePaiement: datePaiementObj, montant: montantValue, modePaiement },
      message: 'Paiement enregistré avec succès'
    })
  } catch (error) {
    console.error('Erreur enregistrement paiement:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du paiement: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
