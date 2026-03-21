import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/echeances/[id] - Mettre à jour une échéance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const echeance = await db.echeanceCredit.findUnique({
      where: { id },
      include: { achatVehicule: true }
    })

    if (!echeance) {
      return NextResponse.json(
        { success: false, error: 'Échéance non trouvée' },
        { status: 404 }
      )
    }

    const {
      dateEcheance,
      montantEcheance,
      statut,
      observations
    } = body

    const updatedEcheance = await db.echeanceCredit.update({
      where: { id },
      data: {
        dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
        montantEcheance: montantEcheance ? parseFloat(montantEcheance) : undefined,
        statut,
        observations
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedEcheance,
      message: 'Échéance mise à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur mise à jour échéance:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'échéance' },
      { status: 500 }
    )
  }
}

// DELETE /api/echeances/[id] - Supprimer une échéance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const echeance = await db.echeanceCredit.findUnique({
      where: { id }
    })

    if (!echeance) {
      return NextResponse.json(
        { success: false, error: 'Échéance non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si l'échéance est payée
    if (echeance.statut === 'PAYEE') {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer une échéance payée' },
        { status: 400 }
      )
    }

    await db.echeanceCredit.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Échéance supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression échéance:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'échéance' },
      { status: 500 }
    )
  }
}
