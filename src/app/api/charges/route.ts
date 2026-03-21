import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TypeCharge, SourceCharge } from '@prisma/client'

// Catégories automatiques - ne peuvent pas être ajoutées manuellement
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

// GET /api/charges - Récupérer les charges
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const type = searchParams.get('type') as TypeCharge | null
    const categorie = searchParams.get('categorie')
    const vehiculeId = searchParams.get('vehiculeId')
    const chauffeurId = searchParams.get('chauffeurId')
    const automatique = searchParams.get('automatique')
    const annee = searchParams.get('annee')
    const mois = searchParams.get('mois')
    const search = searchParams.get('search')

    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = {}
    
    if (type) where.type = type
    if (categorie) where.categorie = categorie
    if (vehiculeId) where.vehiculeId = vehiculeId
    if (chauffeurId) where.chauffeurId = chauffeurId
    if (automatique !== null) where.automatique = automatique === 'true'

    // Filtre par année et mois
    if (annee || mois) {
      const dateFilter: any = {}
      if (annee) {
        const year = parseInt(annee)
        dateFilter.gte = new Date(year, mois ? parseInt(mois) - 1 : 0, 1)
        dateFilter.lte = new Date(year, mois ? parseInt(mois) : 11, mois ? new Date(year, parseInt(mois), 0).getDate() : 31, 23, 59, 59)
      } else if (mois) {
        // Si seulement mois, utiliser l'année en cours
        const year = new Date().getFullYear()
        dateFilter.gte = new Date(year, parseInt(mois) - 1, 1)
        dateFilter.lte = new Date(year, parseInt(mois), 0, 23, 59, 59)
      }
      where.dateCharge = dateFilter
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { fournisseur: { contains: search } },
        { numeroFacture: { contains: search } },
      ]
    }

    // Get total count
    const total = await db.charge.count({ where })
    
    // Get charges with pagination
    const charges = await db.charge.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { dateCharge: 'desc' },
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

    // Récupérer les catégories personnalisées pour les labels
    const categoriesPersonnalisees = await db.categorieChargePersonnalise.findMany()
    const categoriesMap = new Map(categoriesPersonnalisees.map(c => [c.code, c.nom]))
    
    // Ajouter le label de la catégorie
    const chargesWithLabel = charges.map(charge => ({
      ...charge,
      categorieLabel: categoriesMap.get(charge.categorie) || CATEGORIE_LABELS[charge.categorie] || charge.categorie
    }))

    // Calculer les totaux
    const totaux = await db.charge.aggregate({
      where,
      _sum: {
        montant: true
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      data: chargesWithLabel,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      totaux: {
        montant: totaux._sum.montant || 0,
        count: totaux._count.id
      }
    })
  } catch (error) {
    console.error('Erreur récupération charges:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des charges' },
      { status: 500 }
    )
  }
}

// POST /api/charges - Créer une nouvelle charge (manuelles uniquement)
export async function POST(request: NextRequest) {
  try {
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

    if (!categoriePerso.actif) {
      return NextResponse.json(
        { success: false, error: 'Cette catégorie est désactivée' },
        { status: 400 }
      )
    }

    // Vérifier que le véhicule est fourni pour les charges véhicule
    if (type === 'VEHICULE' && !vehiculeId) {
      return NextResponse.json(
        { success: false, error: 'Un véhicule est requis pour les charges véhicule' },
        { status: 400 }
      )
    }

    // Create charge
    const charge = await db.charge.create({
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
        automatique: false,
        sourceType: SourceCharge.MANUEL,
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
      message: 'Charge créée avec succès'
    })
  } catch (error) {
    console.error('Erreur création charge:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la charge' },
      { status: 500 }
    )
  }
}
