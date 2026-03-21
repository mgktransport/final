import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { creerChargeCarburant } from '@/lib/charges-auto'

// GET /api/vehicules/[id]/carburant - Liste des pleins de carburant d'un véhicule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      select: { id: true, immatriculation: true, kilometrage: true },
    })
    
    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }
    
    const pleins = await db.pleinCarburant.findMany({
      where: { vehiculeId: id },
      orderBy: { date: 'desc' },
    })
    
    // Statistiques
    const totalQuantite = pleins.reduce((sum, p) => sum + p.quantite, 0)
    const totalPrix = pleins.reduce((sum, p) => sum + p.prixTotal, 0)
    
    return NextResponse.json({
      success: true,
      data: pleins,
      vehicule,
      summary: {
        total: pleins.length,
        totalQuantite,
        totalPrix,
      },
    })
  } catch (error) {
    console.error('Erreur récupération carburant:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des pleins' },
      { status: 500 }
    )
  }
}

// POST /api/vehicules/[id]/carburant - Ajouter un plein de carburant et créer la charge automatique
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const {
      quantite,
      prixTotal,
      station,
      kilometrage,
      date,
    } = body
    
    // Validation
    if (!quantite || !prixTotal || !date) {
      return NextResponse.json(
        { success: false, error: 'Quantité, prix total et date sont obligatoires' },
        { status: 400 }
      )
    }
    
    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id },
    })
    
    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }
    
    // Validation du kilométrage
    const km = kilometrage ? parseInt(kilometrage) : 0
    
    // Récupérer le dernier plein pour validation du km
    const dernierPlein = await db.pleinCarburant.findFirst({
      where: { vehiculeId: id },
      orderBy: { date: 'desc' },
    })
    
    if (dernierPlein && km > 0 && km <= dernierPlein.kilometrage) {
      return NextResponse.json(
        { success: false, error: `Le kilométrage doit être supérieur au dernier plein (${dernierPlein.kilometrage} km)` },
        { status: 400 }
      )
    }
    
    // Calculer le prix unitaire
    const prixUnitaire = parseFloat(prixTotal) / parseFloat(quantite)
    const datePlein = new Date(date)
    
    // Créer le plein
    const plein = await db.pleinCarburant.create({
      data: {
        vehiculeId: id,
        quantite: parseFloat(quantite),
        prixUnitaire,
        prixTotal: parseFloat(prixTotal),
        station: station || null,
        kilometrage: km,
        date: datePlein,
      },
    })
    
    // Mettre à jour le kilométrage du véhicule si fourni et supérieur
    if (km > 0 && km > vehicule.kilometrage) {
      await db.vehicule.update({
        where: { id },
        data: { kilometrage: km },
      })
    }
    
    // Créer la charge automatique pour ce plein
    try {
      await creerChargeCarburant({
        pleinId: plein.id,
        vehiculeId: id,
        vehiculeImmat: vehicule.immatriculation,
        montant: parseFloat(prixTotal),
        quantite: parseFloat(quantite),
        date: datePlein,
      })
    } catch (chargeError) {
      console.error('Erreur création charge carburant:', chargeError)
      // Continue even if charge creation fails
    }
    
    return NextResponse.json({ success: true, data: plein }, { status: 201 })
  } catch (error) {
    console.error('Erreur création plein:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du plein' },
      { status: 500 }
    )
  }
}
