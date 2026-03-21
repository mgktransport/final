import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/types-entretien/[id] - Récupérer un type personnalisé
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const type = await db.typeEntretienPersonnalise.findUnique({
      where: { id },
    })

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Type non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: type })
  } catch (error) {
    console.error('Erreur récupération type:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du type' },
      { status: 500 }
    )
  }
}

// PUT /api/types-entretien/[id] - Modifier un type personnalisé
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nom, description, actif } = body

    // Vérifier que le type existe
    const existing = await db.typeEntretienPersonnalise.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Type non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour
    const type = await db.typeEntretienPersonnalise.update({
      where: { id },
      data: {
        nom,
        description: description || null,
        actif: actif !== undefined ? actif : true,
      },
    })

    return NextResponse.json({ success: true, data: type })
  } catch (error) {
    console.error('Erreur modification type:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification du type' },
      { status: 500 }
    )
  }
}

// DELETE /api/types-entretien/[id] - Supprimer un type personnalisé
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier que le type existe
    const type = await db.typeEntretienPersonnalise.findUnique({
      where: { id },
    })

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Type non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier s'il est utilisé dans des entretiens
    const entretiensUtilisant = await db.entretien.count({
      where: { type: type.code },
    })

    if (entretiensUtilisant > 0) {
      // Désactiver au lieu de supprimer
      await db.typeEntretienPersonnalise.update({
        where: { id },
        data: { actif: false },
      })

      return NextResponse.json({
        success: true,
        message: `Type désactivé (utilisé dans ${entretiensUtilisant} entretien(s))`,
      })
    }

    // Supprimer
    await db.typeEntretienPersonnalise.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Type supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression type:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du type' },
      { status: 500 }
    )
  }
}
