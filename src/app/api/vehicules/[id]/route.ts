import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicules/[id] - Récupérer un véhicule par son ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const vehicule = await db.vehicule.findUnique({
      where: { id },
      include: {
        chauffeur: {
          select: { id: true, nom: true, prenom: true, telephone: true, actif: true }
        },
        entretiens: {
          orderBy: { dateIntervention: 'desc' },
          take: 50,
        },
        pleinsCarburant: {
          orderBy: { date: 'desc' },
          take: 50,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { entretiens: true, pleinsCarburant: true, documents: true }
        }
      },
    })

    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les statistiques
    const totalCarburant = await db.pleinCarburant.aggregate({
      where: { vehiculeId: id },
      _sum: { prixTotal: true, quantite: true },
    })

    const totalEntretiens = await db.entretien.aggregate({
      where: { vehiculeId: id },
      _sum: { cout: true },
    })

    // Entretiens à venir
    const entretiensAVenir = await db.entretien.findMany({
      where: {
        vehiculeId: id,
        OR: [
          { prochaineDate: { gte: new Date() } },
          { prochainKm: { gte: vehicule.kilometrage } },
        ],
      },
      orderBy: { prochaineDate: 'asc' },
      take: 5,
    })

    const vehiculeWithStats = {
      ...vehicule,
      stats: {
        totalCarburantPrix: totalCarburant._sum.prixTotal || 0,
        totalCarburantLitres: totalCarburant._sum.quantite || 0,
        totalEntretiensCout: totalEntretiens._sum.cout || 0,
      },
      entretiensAVenir,
    }

    return NextResponse.json({ success: true, data: vehiculeWithStats })
  } catch (error) {
    console.error('Erreur récupération véhicule:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du véhicule' },
      { status: 500 }
    )
  }
}

// PUT /api/vehicules/[id] - Modifier un véhicule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      immatriculation,
      marque,
      modele,
      annee,
      capacite,
      kilometrage,
      chauffeurId,
      actif,
    } = body

    // Vérifier que le véhicule existe
    const existing = await db.vehicule.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si la nouvelle immatriculation existe déjà
    if (immatriculation && immatriculation.toUpperCase() !== existing.immatriculation) {
      const otherVehicle = await db.vehicule.findUnique({
        where: { immatriculation: immatriculation.toUpperCase() },
      })
      if (otherVehicle) {
        return NextResponse.json(
          { success: false, error: 'Un véhicule avec cette immatriculation existe déjà' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le véhicule
    const vehicule = await db.vehicule.update({
      where: { id },
      data: {
        immatriculation: immatriculation?.toUpperCase(),
        marque,
        modele,
        annee: annee ? parseInt(annee) : undefined,
        capacite: capacite ? parseInt(capacite) : undefined,
        kilometrage: kilometrage ? parseInt(kilometrage) : undefined,
        chauffeurId: chauffeurId === '' ? null : chauffeurId,
        actif,
      },
      include: {
        chauffeur: {
          select: { id: true, nom: true, prenom: true, telephone: true }
        }
      }
    })

    return NextResponse.json({ success: true, data: vehicule })
  } catch (error) {
    console.error('Erreur modification véhicule:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification du véhicule' },
      { status: 500 }
    )
  }
}

// DELETE /api/vehicules/[id] - Supprimer ou désactiver un véhicule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            services: true,
            entretiens: true,
            pleinsCarburant: true,
          }
        }
      }
    })

    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier s'il y a des relations (services, entretiens, pleins de carburant)
    const hasRelations = vehicule._count.services > 0 ||
                         vehicule._count.entretiens > 0 ||
                         vehicule._count.pleinsCarburant > 0

    if (hasRelations) {
      // Désactiver le véhicule au lieu de le supprimer
      await db.vehicule.update({
        where: { id },
        data: { actif: false }
      })

      return NextResponse.json({
        success: true,
        action: 'deactivated',
        message: 'Véhicule désactivé avec succès (relations existantes)',
        relations: {
          services: vehicule._count.services,
          entretiens: vehicule._count.entretiens,
          pleinsCarburant: vehicule._count.pleinsCarburant,
        }
      })
    }

    // Si pas de relations, on peut supprimer complètement
    // 1. Supprimer les documents du véhicule
    await db.documentVehicule.deleteMany({
      where: { vehiculeId: id },
    })

    // 2. Supprimer le véhicule
    await db.vehicule.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      action: 'deleted',
      message: 'Véhicule supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression véhicule:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du véhicule' },
      { status: 500 }
    )
  }
}
