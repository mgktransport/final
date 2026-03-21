import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mettreAJourChargeCarburant, supprimerChargeCarburant } from '@/lib/charges-auto'

// GET /api/carburant/[id] - Récupérer un plein par son ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plein = await db.pleinCarburant.findUnique({
      where: { id },
      include: {
        vehicule: {
          select: {
            id: true,
            immatriculation: true,
            kilometrage: true,
          },
        },
      },
    })

    if (!plein) {
      return NextResponse.json(
        { success: false, error: 'Plein non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: plein })
  } catch (error) {
    console.error('Erreur récupération plein:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du plein' },
      { status: 500 }
    )
  }
}

// PUT /api/carburant/[id] - Modifier un plein et mettre à jour la charge automatique
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      quantite,
      prixTotal,
      station,
      kilometrage,
      date,
    } = body

    // Vérifier que le plein existe
    const existingPlein = await db.pleinCarburant.findUnique({
      where: { id },
      include: { vehicule: true },
    })

    if (!existingPlein) {
      return NextResponse.json(
        { success: false, error: 'Plein non trouvé' },
        { status: 404 }
      )
    }

    // Validation
    if (!quantite || !prixTotal || !date) {
      return NextResponse.json(
        { success: false, error: 'Quantité, prix total et date sont obligatoires' },
        { status: 400 }
      )
    }

    // Calculer le prix unitaire
    const prixUnitaire = parseFloat(prixTotal) / parseFloat(quantite)
    const km = kilometrage ? parseInt(kilometrage) : 0
    const datePlein = new Date(date)

    // Mettre à jour le plein
    const plein = await db.pleinCarburant.update({
      where: { id },
      data: {
        quantite: parseFloat(quantite),
        prixUnitaire,
        prixTotal: parseFloat(prixTotal),
        station: station || null,
        kilometrage: km,
        date: datePlein,
      },
    })

    // Mettre à jour le kilométrage du véhicule si le nouveau km est supérieur
    if (km > 0 && km > existingPlein.vehicule.kilometrage) {
      await db.vehicule.update({
        where: { id: existingPlein.vehiculeId },
        data: { kilometrage: km },
      })
    }

    // Mettre à jour la charge automatique correspondante
    try {
      await mettreAJourChargeCarburant({
        pleinId: id,
        vehiculeId: existingPlein.vehiculeId,
        vehiculeImmat: existingPlein.vehicule.immatriculation,
        montant: parseFloat(prixTotal),
        quantite: parseFloat(quantite),
        date: datePlein,
      })
    } catch (chargeError) {
      console.error('Erreur mise à jour charge carburant:', chargeError)
      // Continue even if charge update fails
    }

    return NextResponse.json({ success: true, data: plein })
  } catch (error) {
    console.error('Erreur modification plein:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification du plein' },
      { status: 500 }
    )
  }
}

// DELETE /api/carburant/[id] - Supprimer un plein et sa charge automatique
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier que le plein existe
    const plein = await db.pleinCarburant.findUnique({
      where: { id },
    })

    if (!plein) {
      return NextResponse.json(
        { success: false, error: 'Plein non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer la charge automatique correspondante
    try {
      await supprimerChargeCarburant(id)
    } catch (chargeError) {
      console.error('Erreur suppression charge carburant:', chargeError)
      // Continue even if charge deletion fails
    }

    // Supprimer le plein
    await db.pleinCarburant.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Plein supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression plein:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du plein' },
      { status: 500 }
    )
  }
}
