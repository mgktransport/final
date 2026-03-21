import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TypeCharge, SourceCharge } from '@prisma/client'

// Catégories automatiques
const CATEGORIES_AUTOMATIQUES = ['CARBURANT', 'ENTRETIEN_VEHICULE', 'ACHAT_VEHICULE', 'ECHEANCE_CREDIT', 'SALAIRES', 'CHARGES_SOCIALES']

// Labels pour l'affichage
const CATEGORIE_LABELS: Record<string, string> = {
  CARBURANT: 'Carburant',
  ENTRETIEN_VEHICULE: 'Entretien véhicule',
  ACHAT_VEHICULE: 'Achat véhicule',
  ECHEANCE_CREDIT: 'Échéance crédit',
  SALAIRES: 'Salaires',
  CHARGES_SOCIALES: 'Charges sociales',
}

// GET /api/charges/[id] - Récupérer une charge par son ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const charge = await db.charge.findUnique({
      where: { id },
      include: {
        vehicule: {
          select: {
            id: true,
            immatriculation: true,
            marque: true,
            modele: true,
          }
        }
      }
    })

    if (!charge) {
      return NextResponse.json(
        { success: false, error: 'Charge non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer le label de la catégorie
    let categorieLabel = CATEGORIE_LABELS[charge.categorie]
    if (!categorieLabel) {
      const categoriePerso = await db.categorieChargePersonnalise.findUnique({
        where: { code: charge.categorie }
      })
      categorieLabel = categoriePerso?.nom || charge.categorie
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...charge,
        categorieLabel
      }
    })
  } catch (error) {
    console.error('Erreur récupération charge:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la charge' },
      { status: 500 }
    )
  }
}

// PUT /api/charges/[id] - Modifier une charge (manuelles uniquement)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Vérifier que la charge existe
    const existingCharge = await db.charge.findUnique({
      where: { id }
    })

    if (!existingCharge) {
      return NextResponse.json(
        { success: false, error: 'Charge non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la charge n'est pas automatique
    if (existingCharge.automatique) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cette charge a été générée automatiquement et ne peut pas être modifiée' 
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    const type = body.type as TypeCharge
    const categorie = body.categorie as string
    const description = body.description
    const montant = parseFloat(body.montant)
    const dateCharge = body.dateCharge
    const vehiculeId = body.vehiculeId || null
    const fournisseur = body.fournisseur || null
    const numeroFacture = body.numeroFacture || null
    const notes = body.notes || null

    // Validation
    if (!type || !categorie || !description || !montant || !dateCharge) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    // Vérifier que la catégorie n'est pas une catégorie automatique
    if (CATEGORIES_AUTOMATIQUES.includes(categorie)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `La catégorie "${categorie}" est générée automatiquement et ne peut pas être ajoutée manuellement` 
        },
        { status: 400 }
      )
    }

    // Vérifier que la catégorie personnalisée existe et est du bon type
    const categoriePerso = await db.categorieChargePersonnalise.findUnique({
      where: { code: categorie }
    })

    if (!categoriePerso) {
      return NextResponse.json(
        { success: false, error: 'Catégorie non trouvée' },
        { status: 400 }
      )
    }

    if (categoriePerso.type !== type) {
      return NextResponse.json(
        { success: false, error: `La catégorie "${categorie}" n'est pas valide pour ce type de charge` },
        { status: 400 }
      )
    }

    // Update charge
    const charge = await db.charge.update({
      where: { id },
      data: {
        type,
        categorie,
        description,
        montant,
        dateCharge: new Date(dateCharge),
        vehiculeId,
        fournisseur,
        numeroFacture,
        notes,
      },
      include: {
        vehicule: {
          select: {
            id: true,
            immatriculation: true,
            marque: true,
            modele: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...charge,
        categorieLabel: categoriePerso.nom
      },
      message: 'Charge modifiée avec succès'
    })
  } catch (error) {
    console.error('Erreur modification charge:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de la charge' },
      { status: 500 }
    )
  }
}

// DELETE /api/charges/[id] - Supprimer une charge (manuelles uniquement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const charge = await db.charge.findUnique({
      where: { id }
    })

    if (!charge) {
      return NextResponse.json(
        { success: false, error: 'Charge non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la charge n'est pas automatique
    if (charge.automatique) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cette charge a été générée automatiquement et ne peut pas être supprimée' 
        },
        { status: 400 }
      )
    }

    await db.charge.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Charge supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression charge:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la charge' },
      { status: 500 }
    )
  }
}
