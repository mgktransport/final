import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TypeCharge } from '@prisma/client'

// GET /api/categories-charges/[id] - Récupérer une catégorie par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const categorie = await db.categorieChargePersonnalise.findUnique({
      where: { id }
    })

    if (!categorie) {
      return NextResponse.json(
        { success: false, error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categorie
    })
  } catch (error) {
    console.error('Erreur récupération catégorie:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la catégorie' },
      { status: 500 }
    )
  }
}

// PUT /api/categories-charges/[id] - Modifier une catégorie personnalisée
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, nom, type, description, actif } = body

    // Vérifier que la catégorie existe
    const existing = await db.categorieChargePersonnalise.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Si le code change, vérifier qu'il n'existe pas déjà
    if (code && code !== existing.code) {
      const codesAuto = ['CARBURANT', 'ENTRETIEN_VEHICULE', 'ACHAT_VEHICULE', 'ECHEANCE_CREDIT', 'SALAIRES', 'CHARGES_SOCIALES']
      if (codesAuto.includes(code.toUpperCase())) {
        return NextResponse.json(
          { success: false, error: 'Ce code est réservé pour les catégories automatiques' },
          { status: 400 }
        )
      }

      const duplicate = await db.categorieChargePersonnalise.findUnique({
        where: { code: code.toUpperCase() }
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Une catégorie avec ce code existe déjà' },
          { status: 400 }
        )
      }
    }

    const categorie = await db.categorieChargePersonnalise.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase().replace(/\s+/g, '_') : undefined,
        nom: nom || undefined,
        type: type as TypeCharge || undefined,
        description: description !== undefined ? description : undefined,
        actif: actif !== undefined ? actif : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      data: categorie,
      message: 'Catégorie modifiée avec succès'
    })
  } catch (error) {
    console.error('Erreur modification catégorie:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de la catégorie' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories-charges/[id] - Supprimer une catégorie personnalisée
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier que la catégorie existe
    const existing = await db.categorieChargePersonnalise.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier qu'aucune charge n'utilise cette catégorie
    const chargesCount = await db.charge.count({
      where: { categorie: existing.code }
    })

    if (chargesCount > 0) {
      // Désactiver au lieu de supprimer
      await db.categorieChargePersonnalise.update({
        where: { id },
        data: { actif: false }
      })

      return NextResponse.json({
        success: true,
        message: `Catégorie désactivée (${chargesCount} charges l'utilisent)`
      })
    }

    // Supprimer la catégorie
    await db.categorieChargePersonnalise.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression catégorie:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la catégorie' },
      { status: 500 }
    )
  }
}
