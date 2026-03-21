import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Types d'entretien prédéfinis (constants)
const TYPES_ENTRETIEN_PREDEFINIS = [
  { code: 'VIDANGE', nom: 'Vidange', description: "Changement d'huile et filtre" },
  { code: 'PNEUS', nom: 'Pneus', description: 'Remplacement ou réparation des pneus' },
  { code: 'FREINS', nom: 'Freins', description: 'Entretien du système de freinage' },
  { code: 'ASSURANCE_VEHICULE', nom: 'Assurance véhicule', description: "Renouvellement de l'assurance" },
  { code: 'VISITE_TECHNIQUE', nom: 'Visite technique', description: 'Contrôle technique du véhicule' },
  { code: 'REPARATION', nom: 'Réparation', description: 'Réparation mécanique ou carrosserie' },
]

// GET /api/types-entretien - Liste tous les types d'entretien (prédéfinis + personnalisés)
export async function GET(request: NextRequest) {
  try {
    // Récupérer les types personnalisés
    const typesPersonnalises = await db.typeEntretienPersonnalise.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
    })

    // Combiner avec les types prédéfinis
    const tousLesTypes = [
      ...TYPES_ENTRETIEN_PREDEFINIS.map(t => ({
        ...t,
        personnalise: false,
      })),
      ...typesPersonnalises.map(t => ({
        code: t.code,
        nom: t.nom,
        description: t.description,
        personnalise: true,
        id: t.id,
      })),
    ]

    return NextResponse.json({
      success: true,
      data: tousLesTypes,
      predefinis: TYPES_ENTRETIEN_PREDEFINIS,
      personnalises: typesPersonnalises,
    })
  } catch (error) {
    console.error('Erreur récupération types entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des types d\'entretien' },
      { status: 500 }
    )
  }
}

// POST /api/types-entretien - Ajouter un type d'entretien personnalisé
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, nom, description } = body

    // Validation
    if (!code || !nom) {
      return NextResponse.json(
        { success: false, error: 'Le code et le nom sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier que le code n'existe pas déjà dans les types prédéfinis
    if (TYPES_ENTRETIEN_PREDEFINIS.some(t => t.code === code.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Ce code existe déjà dans les types prédéfinis' },
        { status: 400 }
      )
    }

    // Vérifier que le code n'existe pas déjà
    const existant = await db.typeEntretienPersonnalise.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existant) {
      return NextResponse.json(
        { success: false, error: 'Un type d\'entretien avec ce code existe déjà' },
        { status: 400 }
      )
    }

    // Créer le type personnalisé
    const nouveauType = await db.typeEntretienPersonnalise.create({
      data: {
        code: code.toUpperCase(),
        nom,
        description: description || null,
      },
    })

    return NextResponse.json({ success: true, data: nouveauType }, { status: 201 })
  } catch (error) {
    console.error('Erreur création type entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du type d\'entretien' },
      { status: 500 }
    )
  }
}
