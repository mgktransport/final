import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadFileToCloudinary } from '@/lib/cloudinary'

// GET /api/vehicules - Liste tous les véhicules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const actif = searchParams.get('actif')

    const where: any = {}

    if (search) {
      where.OR = [
        { immatriculation: { contains: search } },
        { marque: { contains: search } },
        { modele: { contains: search } },
      ]
    }

    if (actif !== null && actif !== undefined) {
      where.actif = actif === 'true'
    }

    const [vehicules, total] = await Promise.all([
      db.vehicule.findMany({
        where,
        include: {
          chauffeur: {
            select: { id: true, nom: true, prenom: true, telephone: true, actif: true }
          },
          _count: {
            select: { entretiens: true, pleinsCarburant: true, documents: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.vehicule.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: vehicules,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Erreur récupération véhicules:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des véhicules' },
      { status: 500 }
    )
  }
}

// POST /api/vehicules - Créer un nouveau véhicule avec carte grise
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const immatriculation = formData.get('immatriculation') as string
    const marque = formData.get('marque') as string
    const modele = formData.get('modele') as string
    const annee = formData.get('annee') as string
    const typeCarburant = formData.get('typeCarburant') as string || 'DIESEL'
    const capacite = formData.get('capacite') as string
    const kilometrage = formData.get('kilometrage') as string
    const chauffeurId = formData.get('chauffeurId') as string
    
    // Carte grise
    const carteGriseNumero = formData.get('carteGriseNumero') as string
    const carteGriseDateExpiration = formData.get('carteGriseDateExpiration') as string
    const carteGriseFile = formData.get('carteGriseFile') as File | null

    // Validation des champs obligatoires
    if (!immatriculation || !marque || !modele || !annee || !capacite) {
      return NextResponse.json(
        { success: false, error: 'Immatriculation, marque, modèle, année et capacité sont obligatoires' },
        { status: 400 }
      )
    }

    // Validation de la carte grise
    if (!carteGriseNumero || !carteGriseDateExpiration) {
      return NextResponse.json(
        { success: false, error: 'Le numéro et la date d\'expiration de la carte grise sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier si l'immatriculation existe déjà
    const existing = await db.vehicule.findUnique({
      where: { immatriculation: immatriculation.toUpperCase() },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Un véhicule avec cette immatriculation existe déjà' },
        { status: 400 }
      )
    }

    // Créer le véhicule
    const vehicule = await db.vehicule.create({
      data: {
        immatriculation: immatriculation.toUpperCase(),
        marque,
        modele,
        annee: parseInt(annee),
        typeCarburant: typeCarburant || 'DIESEL',
        capacite: parseInt(capacite),
        kilometrage: kilometrage ? parseInt(kilometrage) : 0,
        chauffeurId: chauffeurId || null,
      },
      include: {
        chauffeur: {
          select: { id: true, nom: true, prenom: true, telephone: true }
        }
      }
    })

    // Gérer le fichier de carte grise avec Cloudinary
    let fichierPath: string | null = null
    if (carteGriseFile && carteGriseFile.size > 0) {
      try {
        // Validate file size (5MB max)
        if (carteGriseFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: 'Le fichier ne doit pas dépasser 5MB' },
            { status: 400 }
          )
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
        if (!allowedTypes.includes(carteGriseFile.type)) {
          return NextResponse.json(
            { success: false, error: 'Type de fichier non autorisé (PDF, JPG, PNG uniquement)' },
            { status: 400 }
          )
        }

        // Upload to Cloudinary
        const uploadResult = await uploadFileToCloudinary(carteGriseFile, `vehicules/${vehicule.id}/carte-grise`)
        if (uploadResult.success && uploadResult.url) {
          fichierPath = uploadResult.url
        } else {
          console.error('Cloudinary upload failed:', uploadResult.error)
        }
      } catch (fileError) {
        console.error('Erreur lors de l\'enregistrement du fichier:', fileError)
        // On continue même si le fichier n'a pas pu être sauvegardé
      }
    }

    // Créer le document carte grise
    await db.documentVehicule.create({
      data: {
        vehiculeId: vehicule.id,
        type: 'CARTE_GRISE',
        numero: carteGriseNumero.toUpperCase(),
        dateExpiration: new Date(carteGriseDateExpiration),
        fichier: fichierPath,
      }
    })

    return NextResponse.json({ success: true, data: vehicule }, { status: 201 })
  } catch (error) {
    console.error('Erreur création véhicule:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du véhicule' },
      { status: 500 }
    )
  }
}
