import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TypeCharge } from '@prisma/client'

// GET /api/categories-charges - Récupérer toutes les catégories de charges
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as TypeCharge | null
    const actifOnly = searchParams.get('actif') === 'true'

    // Catégories automatiques (enum)
    const categoriesAuto = [
      { code: 'CARBURANT', nom: 'Carburant', type: 'VEHICULE', automatique: true, description: 'Pleins de carburant' },
      { code: 'ENTRETIEN_VEHICULE', nom: 'Entretien véhicule', type: 'VEHICULE', automatique: true, description: 'Entretiens véhicules' },
      { code: 'ACHAT_VEHICULE', nom: 'Achat véhicule', type: 'VEHICULE', automatique: true, description: 'Achats de véhicules' },
      { code: 'ECHEANCE_CREDIT', nom: 'Échéance crédit', type: 'VEHICULE', automatique: true, description: 'Paiements échéances crédit' },
      { code: 'SALAIRES', nom: 'Salaires', type: 'SOCIETE', automatique: true, description: 'Salaires payés' },
      { code: 'CHARGES_SOCIALES', nom: 'Charges sociales', type: 'SOCIETE', automatique: true, description: 'CNSS + Assurance' },
    ]

    // Catégories personnalisées
    const where: any = {}
    if (type) where.type = type
    if (actifOnly) where.actif = true

    const categoriesPersonnalisees = await db.categorieChargePersonnalise.findMany({
      where,
      orderBy: [{ type: 'asc' }, { nom: 'asc' }]
    })

    // Combiner les deux listes
    const categories = [
      ...categoriesAuto
        .filter(cat => !type || cat.type === type)
        .map(cat => ({
          ...cat,
          id: cat.code,
          type: cat.type as TypeCharge,
        })),
      ...categoriesPersonnalisees.map(cat => ({
        ...cat,
        automatique: false,
      }))
    ]

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Erreur récupération catégories:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des catégories' },
      { status: 500 }
    )
  }
}

// POST /api/categories-charges - Créer une nouvelle catégorie personnalisée
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, nom, type, description } = body

    // Validation
    if (!code || !nom || !type) {
      return NextResponse.json(
        { success: false, error: 'Code, nom et type sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier que le code n'existe pas déjà (enum ou personnalisé)
    const codesAuto = ['CARBURANT', 'ENTRETIEN_VEHICULE', 'ACHAT_VEHICULE', 'ECHEANCE_CREDIT', 'SALAIRES', 'CHARGES_SOCIALES']
    if (codesAuto.includes(code.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Ce code est réservé pour les catégories automatiques' },
        { status: 400 }
      )
    }

    // Vérifier que le code n'existe pas déjà
    const existing = await db.categorieChargePersonnalise.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Une catégorie avec ce code existe déjà' },
        { status: 400 }
      )
    }

    const categorie = await db.categorieChargePersonnalise.create({
      data: {
        code: code.toUpperCase().replace(/\s+/g, '_'),
        nom,
        type: type as TypeCharge,
        description: description || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: categorie,
      message: 'Catégorie créée avec succès'
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur création catégorie:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la catégorie' },
      { status: 500 }
    )
  }
}
