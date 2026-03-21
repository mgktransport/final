import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mettreAJourChargeEntretien, supprimerChargeEntretien } from '@/lib/charges-auto'

// Types d'entretien prédéfinis pour l'affichage
const TYPES_ENTRETIEN_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  PNEUS: 'Pneus',
  FREINS: 'Freins',
  ASSURANCE_VEHICULE: 'Assurance',
  VISITE_TECHNIQUE: 'Visite technique',
  REPARATION: 'Réparation',
}

function getTypeEntretienLabel(type: string): string {
  return TYPES_ENTRETIEN_LABELS[type] || type
}

// GET /api/entretiens/[id] - Récupérer un entretien par son ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const entretien = await db.entretien.findUnique({
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

    if (!entretien) {
      return NextResponse.json(
        { success: false, error: 'Entretien non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: entretien })
  } catch (error) {
    console.error('Erreur récupération entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'entretien' },
      { status: 500 }
    )
  }
}

// PUT /api/entretiens/[id] - Modifier un entretien et mettre à jour la charge automatique
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      type,
      description,
      cout,
      kilometrage,
      dateIntervention,
      prochainKm,
      prochaineDate,
    } = body

    // Vérifier que l'entretien existe
    const existingEntretien = await db.entretien.findUnique({
      where: { id },
      include: { vehicule: true },
    })

    if (!existingEntretien) {
      return NextResponse.json(
        { success: false, error: 'Entretien non trouvé' },
        { status: 404 }
      )
    }

    // Validation
    if (!type || !cout || !dateIntervention) {
      return NextResponse.json(
        { success: false, error: 'Type, coût et date d\'intervention sont obligatoires' },
        { status: 400 }
      )
    }

    const dateInterv = new Date(dateIntervention)

    // Mettre à jour l'entretien
    const entretien = await db.entretien.update({
      where: { id },
      data: {
        type,
        description: description || null,
        cout: parseFloat(cout),
        kilometrage: kilometrage ? parseInt(kilometrage) : null,
        dateIntervention: dateInterv,
        prochainKm: prochainKm ? parseInt(prochainKm) : null,
        prochaineDate: prochaineDate ? new Date(prochaineDate) : null,
      },
    })

    // Mettre à jour le kilométrage du véhicule si le nouveau km est supérieur
    if (kilometrage && parseInt(kilometrage) > existingEntretien.vehicule.kilometrage) {
      await db.vehicule.update({
        where: { id: existingEntretien.vehiculeId },
        data: { kilometrage: parseInt(kilometrage) },
      })
    }

    // Mettre à jour la charge automatique correspondante
    try {
      await mettreAJourChargeEntretien({
        entretienId: id,
        vehiculeId: existingEntretien.vehiculeId,
        vehiculeImmat: existingEntretien.vehicule.immatriculation,
        typeEntretien: getTypeEntretienLabel(type),
        montant: parseFloat(cout),
        date: dateInterv,
      })
    } catch (chargeError) {
      console.error('Erreur mise à jour charge entretien:', chargeError)
      // Continue even if charge update fails
    }

    return NextResponse.json({ success: true, data: entretien })
  } catch (error) {
    console.error('Erreur modification entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de l\'entretien' },
      { status: 500 }
    )
  }
}

// DELETE /api/entretiens/[id] - Supprimer un entretien et sa charge automatique
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier que l'entretien existe
    const entretien = await db.entretien.findUnique({
      where: { id },
    })

    if (!entretien) {
      return NextResponse.json(
        { success: false, error: 'Entretien non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer la charge automatique correspondante
    try {
      await supprimerChargeEntretien(id)
    } catch (chargeError) {
      console.error('Erreur suppression charge entretien:', chargeError)
      // Continue even if charge deletion fails
    }

    // Supprimer l'entretien
    await db.entretien.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Entretien supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'entretien' },
      { status: 500 }
    )
  }
}
